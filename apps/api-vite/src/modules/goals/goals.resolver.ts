import { Query, Resolver } from '@nestjs/graphql';

import { Goal } from '#modules/goals/goal.model';
import { GoalsService } from '#modules/goals/goals.service';

@Resolver(() => Goal)
export class GoalsResolver {
  constructor(private readonly goalsService: GoalsService) {}

  @Query(() => [Goal])
  goals(): Goal[] {
    return this.goalsService.findAll();
  }
}
