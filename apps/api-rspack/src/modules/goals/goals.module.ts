import { Module } from '@nestjs/common';

import { GoalsResolver } from '#modules/goals/goals.resolver';
import { GoalsService } from '#modules/goals/goals.service';

@Module({
  providers: [GoalsResolver, GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}
