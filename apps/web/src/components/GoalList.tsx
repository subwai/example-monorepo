import { Card } from '@example/design-system';

import type { Goal } from '#api';

export interface GoalListProps {
  goals: Goal[] | undefined;
}

export function GoalList({ goals }: GoalListProps) {
  return (
    <Card title="Goals">
      {goals === undefined ? (
        <p>Start the api-rspack app (`pnpm -F api-rspack dev`) to load goals.</p>
      ) : (
        <ul>
          {goals.map(goal => (
            <li key={goal.id}>
              {goal.completed ? '✓' : '○'} {goal.title}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
