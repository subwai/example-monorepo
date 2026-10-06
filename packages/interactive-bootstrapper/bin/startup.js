#!/usr/bin/env node
// Node prints a `punycode` deprecation warning (DEP0040) the first time a
// transitive dependency touches the built-in module. It fires asynchronously
// and can land in the middle of an interactive prompt, splitting the input line
// and corrupting the menu. Suppress deprecation warnings natively (equivalent to
// `node --no-deprecation`) rather than hand-rolling an emitWarning filter. Must
// run before anything else is imported so it's in place whenever the warning fires.
process.noDeprecation = true;

// Tell Turborepo not to show the update notifier
process.env.TURBO_NO_UPDATE_NOTIFIER = 'true';
process.env.TURBO_TELEMETRY_DISABLED = '1';
process.env.NODE_ENV = 'development';

// Node runs the TypeScript in src directly (type stripping), so there is no compile step.
try {
  await import('../src/index.ts');
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  console.error(`
  ---------------------------------------------------------------------------------
              Interactive bootstrapper encountered an error.
      This can happen if its dependencies have changed and need to be reinstalled.
                        Please run 'pnpm install' and try again.
  ---------------------------------------------------------------------------------
  `);
  process.exit(1);
}
