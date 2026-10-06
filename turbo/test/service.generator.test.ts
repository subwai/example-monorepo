import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import { describe, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

const run = (command: string, args: string[]): void => {
  execFileSync(command, args, { cwd: root, stdio: 'inherit' });
};

// Generates a real service into this checkout, installs it, and checks, tests and builds it with everything it
// depends on. It changes the working tree, so it only runs in CI, on a throwaway checkout.
describe.runIf(process.env.CI)('service generator against the real workspace', () => {
  it('generates a GraphQL and gRPC service that checks, tests and builds', () => {
    run('pnpm', ['gen', 'service', '--args', 'generator-ci', 'example-org/platform', 'GraphQL,gRPC']);
    run('pnpm', ['turbo', 'run', 'check', 'test', 'build', '--filter=generator-ci...']);
  });
});
