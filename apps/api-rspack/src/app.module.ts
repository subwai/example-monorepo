import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';

import { HealthModule } from '@example/nest-health';

import { GoalsModule } from '#modules/goals/goals.module';
import { schemaPath } from '#schema-path';

@Module({
  imports: [
    HealthModule.forService('api-rspack'),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: schemaPath('main') ?? true,
      sortSchema: true,
    }),
    GoalsModule,
  ],
})
export class AppModule {}
