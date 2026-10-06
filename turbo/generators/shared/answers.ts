import type { PlopTypes } from '@turbo/gen';

export type Answers = PlopTypes.Answers | undefined;

export const readString = (answers: Answers, key: string): string => {
  const value: unknown = answers?.[key];
  if (typeof value !== 'string') {
    throw new Error(`Expected answer "${key}" to be a string`);
  }
  return value.trim();
};

/** Checkbox answers arrive as an array interactively and from `--args` ("a,b" or ""). */
export const readList = (answers: Answers, key: string): string[] => {
  const value: unknown = answers?.[key];
  const items = typeof value === 'string' ? value.split(',') : value;
  if (!Array.isArray(items)) {
    throw new Error(`Expected answer "${key}" to be a list`);
  }
  return items.map(String).map(item => item.trim()).filter(item => item !== '');
};
