export const colors = {
  primary: '#4f46e5',
  primaryText: '#ffffff',
  surface: '#ffffff',
  border: '#e5e7eb',
  text: '#111827',
  muted: '#6b7280',
} as const;

export const space = (steps: number): string => `${steps * 4}px`;

export const radius = '8px';
