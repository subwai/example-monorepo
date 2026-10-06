import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import type { PlopTypes } from '@turbo/gen';

type Data = Record<string, unknown>;

/**
 * Renders every file under `templates/<template>/` into `destination`. File names are templates too, and a
 * trailing `.hbs` is dropped, but only from names with another dot in them: render extensionless files such as
 * `Dockerfile` with `addTemplate`.
 */
export const addTemplates = (template: string, destination: string, data: Data): PlopTypes.AddManyActionConfig => ({
  type: 'addMany',
  destination,
  // @turbo/gen's type requires `path` even though addMany replaces it with each file's own path.
  path: destination,
  base: `templates/${template}`,
  templateFiles: `templates/${template}/**`,
  globOptions: { dot: true },
  data,
  abortOnFail: true,
});

/** Renders one template file to `path`. */
export const addTemplate = (templateFile: string, path: string, data: Data): PlopTypes.AddActionConfig => ({
  type: 'add',
  path,
  templateFile: `templates/${templateFile}`,
  data,
  abortOnFail: true,
});

export interface Injection {
  /** Repo-relative path of an existing file. */
  path: string;
  /** Text of the line to insert next to. Its absence fails the run rather than silently skipping. */
  marker: string;
  position: 'before' | 'after';
  /** Handlebars template for the inserted lines. */
  template: string;
  data: Data;
}

/** Inserts rendered lines before or after a marker line in an existing file. */
export const inject =
  (root: string, { path, marker, position, template, data }: Injection): PlopTypes.CustomActionFunction =>
  (_answers, _config, plop) => {
    const file = join(root, path);
    const lines = readFileSync(file, 'utf8').split('\n');
    const index = lines.findIndex(line => line.includes(marker));
    if (index === -1) {
      throw new Error(`${path} has no "${marker}" line to insert next to`);
    }
    const inserted = plop.renderString(template, data).replace(/\n$/, '').split('\n');
    lines.splice(position === 'before' ? index : index + 1, 0, ...inserted);
    writeFileSync(file, lines.join('\n'));
    return `${path} (inject)`;
  };

/** Appends rendered text to an existing file. */
export const append =
  (root: string, path: string, template: string, data: Data): PlopTypes.CustomActionFunction =>
  (_answers, _config, plop) => {
    const file = join(root, path);
    const current = readFileSync(file, 'utf8');
    appendFileSync(file, `${current.endsWith('\n') ? '' : '\n'}${plop.renderString(template, data)}`);
    return `${path} (append)`;
  };

/** Adds a script to an existing package.json, keeping scripts sorted. */
export const addScript =
  (root: string, workspace: string, name: string, command: string): PlopTypes.CustomActionFunction =>
  () => {
    const file = join(root, workspace, 'package.json');
    const manifest = JSON.parse(readFileSync(file, 'utf8')) as { scripts?: Record<string, string> };
    const scripts = { ...manifest.scripts, [name]: command };
    manifest.scripts = sortKeys(scripts);
    writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
    return `${relative(root, file)} (script ${name})`;
  };

const sortKeys = (record: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));

/** Sorts a rendered package.json's dependency maps, whose order in a template can depend on the answers. */
export const sortDependencies =
  (root: string, workspace: string): PlopTypes.CustomActionFunction =>
  () => {
    const file = join(root, workspace, 'package.json');
    const manifest = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    for (const key of ['dependencies', 'devDependencies', 'peerDependencies']) {
      const record = manifest[key];
      if (record !== undefined) {
        manifest[key] = sortKeys(record as Record<string, string>);
      }
    }
    writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
    return `${workspace}/package.json (sorted dependencies)`;
  };

/** Fails the run before any file is written if the destination already exists. */
export const assertAbsent =
  (root: string, path: string): PlopTypes.CustomActionFunction =>
  () => {
    if (existsSync(join(root, path))) {
      throw new Error(`${path} already exists`);
    }
    return `${path} is free`;
  };
