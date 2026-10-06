import { resolve } from 'node:path';

export const monoRepoRoot = resolve(import.meta.dirname, '..', '..', '..');

export const PROCFILE_PATH = resolve(import.meta.dirname, 'Procfile');
