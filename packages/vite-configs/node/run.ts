// `labuild run [file] [args...]`: runs a TypeScript file once through Vite's module runner, e.g. a script, a seed or
// a one-off server mode. As in `labuild dev`, workspace packages resolve to their `src` (`development` condition), so
// nothing needs a build first. The file sees `process.argv` as if Node had run it: `[node, file, ...args]`.
import { existsSync, readFileSync } from 'node:fs';
import { open as openInspector } from 'node:inspector';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const DEFAULT_ENTRY = 'src/index.ts';
const DEFAULT_INSPECT_HOST = '127.0.0.1';
const DEFAULT_INSPECT_PORT = 9229;

interface Inspector {
  host: string;
  port: number;
  /** Wait for a debugger to attach before running the file. */
  wait: boolean;
}

/** `--debug` and `--debug-wait`, each with an optional `=[host:]port`. */
const debugFlag = /^--(debug|debug-wait)(?:=(.*))?$/;
/** A `[host:]port` given as the next argument, e.g. `--debug 9230`. A host alone needs `=`. */
const separateHostPort = /^(?:[\w.-]*:)?\d+$/;

const parseInspector = (flag: string, value: string | undefined): Inspector => {
  const [host, port] = value === undefined || /^\d+$/.test(value) ? [undefined, value] : value.split(':');
  return {
    host: host || DEFAULT_INSPECT_HOST,
    port: Number.parseInt(port ?? '', 10) || DEFAULT_INSPECT_PORT,
    wait: flag === 'debug-wait',
  };
};

/**
 * `pnpm start` with "Enable Debugging" sets ENABLE_NODE_DEBUGGING and DEBUG_SERVICE, and the Procfile gives each
 * process its LABUILD_COORDINATOR_PROC_NAME and a static LABUILD_DEBUG_PORT. Only the chosen service opens an
 * inspector. This wins over `--debug` flags.
 */
const inspectorFromEnv = (): Inspector | undefined => {
  if (
    process.env.ENABLE_NODE_DEBUGGING !== 'true' ||
    process.env.LABUILD_COORDINATOR_PROC_NAME !== (process.env.DEBUG_SERVICE || 'api-rspack')
  ) {
    return undefined;
  }
  const port = Number.parseInt(process.env.LABUILD_DEBUG_PORT ?? '', 10) || DEFAULT_INSPECT_PORT;
  return { host: DEFAULT_INSPECT_HOST, port, wait: false };
};

/**
 * Outside production, loads `.env.$NODE_ENV` and, in development, a local `.env` that overrides it. Variables that are
 * already set win over both files. `LABUILD_DISABLE_DOTENV=true` skips this.
 */
const loadEnv = (nodeEnv: string): void => {
  if (process.env.LABUILD_DISABLE_DOTENV === 'true' || nodeEnv === 'production') {
    return;
  }
  const read = (file: string) => (existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {});
  const local = nodeEnv === 'development' ? read('.env') : {};
  const blank = Object.entries(local).filter(([, value]) => value?.trim() === '');
  if (blank.length > 0 && !process.env.DX_IGNORE_MISCONFIGURED_ENV_VARS) {
    console.error(
      `Your .env sets these variables to blank values, which may be a mistake:\n\n` +
        `${blank.map(([key, value]) => `${key}=${value}`).join('\n')}\n\n` +
        `Delete them, or delete .env, unless you mean to override .env.development. ` +
        `DX_IGNORE_MISCONFIGURED_ENV_VARS=true silences this.\n`,
    );
  }
  for (const [key, value] of Object.entries({ ...read(`.env.${nodeEnv}`), ...local })) {
    if (value !== undefined) {
      process.env[key] ??= value;
    }
  }
};

/** Runs `labuild run`'s arguments: an optional file (default `src/index.ts`), then the file's own arguments. */
export const runFile = async (argv: readonly string[]): Promise<void> => {
  let inspector = inspectorFromEnv();
  const args: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? '';
    const match = debugFlag.exec(arg);
    if (match === null) {
      args.push(arg);
      continue;
    }
    let value = match[2];
    if (value === undefined && separateHostPort.test(argv[i + 1] ?? '')) {
      value = argv[++i];
    }
    inspector ??= parseInspector(match[1] ?? '', value);
  }
  const [entry, scriptArgs] =
    args[0] === undefined || args[0].startsWith('-') ? [DEFAULT_ENTRY, args] : [args[0], args.slice(1)];

  // Starts with `node` so tools that look for Node processes by name still find it.
  process.title = `node-labuild-run-${process.env.LABUILD_COORDINATOR_PROC_NAME || basename(process.cwd())}`;
  // Started with an IPC channel (e.g. by a dev coordinator): exit with the parent rather than linger as an orphan.
  if (process.connected) {
    process.on('disconnect', () => process.exit(0));
  }
  loadEnv(process.env.NODE_ENV ?? 'development');

  const file = resolve(entry);
  if (!existsSync(file)) {
    console.error(`labuild run: ${file} doesn't exist`);
    process.exit(1);
  }

  // Before Vite loads: importing it installs signal handlers, which can't run while --debug-wait blocks the thread, so
  // Ctrl-C and SIGTERM would stop working.
  if (inspector !== undefined) {
    if (inspector.wait) {
      console.log('Waiting for a debugger to connect before proceeding...');
    }
    openInspector(inspector.port, inspector.host, inspector.wait);
    // A pause right after attaching, e.g. to start a CPU profile before anything runs.
    if (process.env.LABUILD_SLEEP_AFTER_DEBUG_ATTACHED) {
      debugger;
    }
  }

  const { createServer, createServerModuleRunner } = await import('vite');
  const server = await createServer({
    // The workspace's own Vite config if it has one (Nest apps on Vite), otherwise the shared one for Node.
    configFile: existsSync('vite.config.ts') ? 'vite.config.ts' : fileURLToPath(import.meta.resolve('./vite.config.ts')),
    // Runs once: no file watching, no HMR, no websocket.
    server: { middlewareMode: true, ws: false, hmr: false, watch: null },
    appType: 'custom',
  });
  const runner = createServerModuleRunner(server.environments.ssr, { hmr: false });

  process.argv = [process.argv[0] ?? process.execPath, file, ...scriptArgs];
  await runner.import(file);
};
