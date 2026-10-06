import { Query, Resolver } from '@nestjs/graphql';

import { FederationTest } from '#modules/goals/subgraph/federation-test/federation-test.model';

@Resolver(() => FederationTest)
export class FederationTestResolver {
  @Query(() => FederationTest, { name: 'goalsFederationTest' })
  federationTest(): FederationTest {
    return { federated: true, goals: true };
  }
}
