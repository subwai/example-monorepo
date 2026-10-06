import { Button } from '@example/design-system';
import { useState } from 'react';

import { fetchGoals } from '#api';
import { GoalList } from '#components/GoalList';

import type { Route } from './+types/home';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Example monorepo' }];
}

export async function loader(_: Route.LoaderArgs) {
  return { goals: await fetchGoals() };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const [clicks, setClicks] = useState(0);
  return (
    <main style={{ maxWidth: 640, margin: '48px auto', display: 'grid', gap: 16 }}>
      <h1>Example monorepo</h1>
      <GoalList goals={loaderData.goals} />
      <Button onClick={() => setClicks(clicks + 1)}>Clicked {clicks} times</Button>
    </main>
  );
}
