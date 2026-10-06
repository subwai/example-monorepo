import type { ReactNode } from 'react';

import { colors, radius, space } from '#tokens';

export interface CardProps {
  title: string;
  children?: ReactNode;
}

export function Card({ title, children }: CardProps) {
  return (
    <section
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius,
        padding: space(4),
        color: colors.text,
      }}
    >
      <h2 style={{ margin: 0, marginBottom: space(2), fontSize: '1.125rem' }}>{title}</h2>
      {children}
    </section>
  );
}
