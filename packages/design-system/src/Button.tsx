import type { ButtonHTMLAttributes } from 'react';

import { colors, radius, space } from '#tokens';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ style, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      style={{
        background: colors.primary,
        color: colors.primaryText,
        border: 'none',
        borderRadius: radius,
        padding: `${space(2)} ${space(4)}`,
        cursor: 'pointer',
        ...style,
      }}
      {...props}
    />
  );
}
