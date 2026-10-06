import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GoalList } from '#components/GoalList';

describe('GoalList', () => {
  it('lists goals inside a design-system card', () => {
    render(<GoalList goals={[{ id: '1', title: 'Ship it', completed: true }]} />);

    expect(screen.getByRole('heading', { name: 'Goals' })).toBeDefined();
    expect(screen.getByText('✓ Ship it')).toBeDefined();
  });

  it('explains how to start api-rspack when goals are missing', () => {
    render(<GoalList goals={undefined} />);

    expect(screen.getByText(/pnpm -F api-rspack dev/)).toBeDefined();
  });
});
