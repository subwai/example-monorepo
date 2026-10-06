import { describe, expect, it } from 'vitest';

import { rewriteCommandPaths, unfurlScript } from '#genProcfile';

describe('unfurlScript', () => {
  it('follows nested pnpm scripts down to the command that runs', () => {
    const scripts = {
      dev: 'labuild dev',
      'dev:subgraph-goals': 'SERVER_TYPE=subgraph:goals pnpm dev',
    };

    expect(unfurlScript(scripts, 'dev:subgraph-goals')).toBe('SERVER_TYPE=subgraph:goals labuild dev');
  });

  it('rejects circular and missing scripts', () => {
    expect(() => unfurlScript({ a: 'pnpm b', b: 'pnpm a' }, 'a')).toThrow(/Circular script reference: a -> b -> a/);
    expect(() => unfurlScript({ a: 'pnpm run b' }, 'a')).toThrow(/Missing script "b"/);
  });
});

describe('rewriteCommandPaths', () => {
  it('points CLI tools at the workspace node_modules/.bin, since the Procfile runs outside pnpm', () => {
    expect(rewriteCommandPaths('react-router dev --port ${PORT:-5173}')).toBe(
      './node_modules/.bin/react-router dev --port ${PORT:-5173}',
    );
    expect(rewriteCommandPaths('SERVER_TYPE=x labuild dev')).toBe('SERVER_TYPE=x ./node_modules/.bin/labuild dev');
  });

  it('leaves longer names that start with a tool name alone', () => {
    expect(rewriteCommandPaths('react-router-serve ./dist/server/index.js')).toBe(
      'react-router-serve ./dist/server/index.js',
    );
  });
});
