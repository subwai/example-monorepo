import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** The repo layout the generators read and write. Built once when the generator config loads. */
export interface Repo {
  root: string;
  /** `apps/*` and `packages/*` directories that hold a package.json, e.g. `apps/web`. */
  workspaces: string[];
  /** Modules in the api-rspack app that don't have a subgraph yet. */
  apiModulesWithoutSubgraph: string[];
}

export const API_APP = 'apps/api-rspack';

const findRepoRoot = (from: string): string => {
  if (existsSync(join(from, 'pnpm-workspace.yaml'))) {
    return from;
  }
  const parent = dirname(from);
  if (parent === from) {
    throw new Error('pnpm-workspace.yaml not found above the generator config');
  }
  return findRepoRoot(parent);
};

const listDirectories = (path: string): string[] =>
  existsSync(path)
    ? readdirSync(path, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort()
    : [];

/** `GENERATOR_REPO_ROOT` points the generators at another tree; the tests use it for their fixture repos. */
export const readRepo = (plopfileDirectory: string): Repo => {
  const root = process.env.GENERATOR_REPO_ROOT ?? findRepoRoot(plopfileDirectory);
  const workspaces = ['apps', 'packages'].flatMap(group =>
    listDirectories(join(root, group))
      .map(name => `${group}/${name}`)
      .filter(path => existsSync(join(root, path, 'package.json'))),
  );
  const modules = join(root, API_APP, 'src/modules');
  const apiModulesWithoutSubgraph = listDirectories(modules).filter(
    module => !existsSync(join(modules, module, 'subgraph')),
  );
  return { root, workspaces, apiModulesWithoutSubgraph };
};

/** The `name` in a workspace's package.json, which is what `pnpm -F` filters on. */
export const workspaceName = (root: string, workspace: string): string => {
  const { name } = JSON.parse(readFileSync(join(root, workspace, 'package.json'), 'utf8')) as { name?: unknown };
  if (typeof name !== 'string') {
    throw new Error(`${workspace}/package.json has no name`);
  }
  return name;
};

export const packageName = (name: string): string => `@example/${name}`;
