import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CATALOG } from './catalog.ts';

/**
 * The first port from `from` that's free, along with the ports at `offsets` from it. Every number in the catalog
 * counts as taken: its services' ports and the ones it reserves, like Postgres and the debugger. Unlike a random
 * port, it can't clash with an existing service, and CI's generated service is the same on every run, so it hits
 * turbo's cache.
 */
export const unusedPort = (root: string, from: number, offsets: number[] = []): number => {
  const catalog = readFileSync(join(root, CATALOG), 'utf8');
  const taken = new Set([...catalog.matchAll(/\b\d{4,5}\b/g)].map(([match]) => Number(match)));
  let port = from;
  while ([0, ...offsets].some(offset => taken.has(port + offset))) {
    port += 1;
  }
  return port;
};
