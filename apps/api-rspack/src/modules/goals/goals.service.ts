import { Injectable } from '@nestjs/common';

import type { Goal } from '#modules/goals/goal.model';

@Injectable()
export class GoalsService {
  private readonly goals: Goal[] = [
    { id: '1', title: 'Ship the generators', completed: true },
    { id: '2', title: 'Move apps to rspack and vite', completed: false },
  ];

  findAll(): Goal[] {
    return this.goals;
  }
}
