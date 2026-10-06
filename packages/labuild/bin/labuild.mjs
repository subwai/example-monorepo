#!/usr/bin/env node
// @ts-check
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const usage = `Usage: labuild <command> [args...]

Run it from a workspace directory, as pnpm scripts do.

  check     Type-check with tsc (tsconfig.json). Needs no build: workspace packages resolve to src.
  build     Nest apps: production bundle with rspack (rspack.config.ts) or Vite (vite.config.ts).
            Packages: generate code (buf.gen.yaml) if any, then compile src to dist with tsconfig.build.json.
  codegen   Generate code from proto/ with buf and ts-proto, if the package has a buf.gen.yaml.
  dev       Nest apps on rspack: bundle in watch mode and restart the app after every rebuild.
            Nest apps on Vite: run through Vite's module runner and re-run changed modules in place.
  test      Run vitest once. Extra args go to vitest, e.g. \`labuild test --project unit\`.`;

// labuild runs the tools it depends on, so a workspace needs @example/labuild rather than each tool.
const tools = join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', '.bin');
const env = { ...process.env, PATH: `${tools}${delimiter}${process.env.PATH ?? ''}` };

/**
 * @param {string} command
 * @param {string[]} args
 * @param {Record<string, string>} [extraEnv]
 */
const run = (command, args, extraEnv = {}) => {
  const { status, error } = spawnSync(command, args, { stdio: 'inherit', env: { ...env, ...extraEnv } });
  if (error !== undefined) {
    throw error;
  }
  if (status !== 0) {
    process.exit(status ?? 1);
  }
};

/** @returns {'rspack' | 'vite' | undefined} How this Nest app is bundled, from its config file. */
const nestBundler = () => {
  if (existsSync('rspack.config.ts')) return 'rspack';
  if (existsSync('vite.config.ts')) return 'vite';
  return undefined;
};

const codegen = () => {
  if (existsSync('buf.gen.yaml')) {
    run('buf', ['generate']);
  }
};

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case 'check':
    run('tsc', args.length > 0 ? args : ['-p', 'tsconfig.json']);
    break;
  case 'build':
    if (nestBundler() === 'rspack') {
      run('rspack', ['build', '--mode', 'production', ...args], { NODE_ENV: 'production' });
    } else if (nestBundler() === 'vite') {
      run('vite', ['build', ...args], { NODE_ENV: 'production' });
    } else {
      codegen();
      rmSync('dist', { recursive: true, force: true });
      run('tsc', ['-p', 'tsconfig.build.json', ...args]);
    }
    break;
  case 'codegen':
    codegen();
    break;
  case 'dev':
    if (nestBundler() === 'rspack') {
      run('rspack', ['build', '--watch', '--mode', 'development', ...args], { NODE_ENV: 'development' });
    } else if (nestBundler() === 'vite') {
      const runner = fileURLToPath(import.meta.resolve('@example/vite-configs/node/dev'));
      run(process.execPath, [runner, ...args], { NODE_ENV: 'development' });
    } else {
      console.error(`labuild dev needs an rspack.config.ts or vite.config.ts in ${process.cwd()}`);
      process.exit(1);
    }
    break;
  case 'test':
    run('vitest', ['run', ...args]);
    break;
  default:
    console.error(usage);
    process.exit(command === undefined || command === 'help' ? 0 : 1);
}
