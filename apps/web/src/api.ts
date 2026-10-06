export interface Goal {
  id: string;
  title: string;
  completed: boolean;
}

const API_URL = process.env.API_URL ?? 'http://localhost:3000/graphql';

/** Loads goals from the api-rspack app. Returns `undefined` when it isn't running. */
export async function fetchGoals(): Promise<Goal[] | undefined> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ goals { id title completed } }' }),
    });
    const { data } = (await response.json()) as { data?: { goals: Goal[] } };
    return data?.goals;
  } catch {
    return undefined;
  }
}
