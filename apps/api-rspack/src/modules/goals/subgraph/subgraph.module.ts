import { ApolloFederationDriver, type ApolloFederationDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';

import { HealthModule } from '@example/nest-health';

import { GoalsModule } from '#modules/goals/goals.module';
import { FederationTestResolver } from '#modules/goals/subgraph/federation-test/federation-test.resolver';
import { schemaPath } from '#schema-path';
import type { Subgraph } from '#subgraph-server';

@Module({
  imports: [
    HealthModule.forService('api-rspack-subgraph-goals'),
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: { federation: 2, path: schemaPath('goals') },
      sortSchema: true,
    }),
    GoalsModule,
  ],
  providers: [FederationTestResolver],
})
export class GoalsSubgraphModule {}

export const subgraph: Subgraph = {
  name: 'goals',
  port: 6433,
  module: GoalsSubgraphModule,
};
