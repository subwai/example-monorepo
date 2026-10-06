import { Field, ObjectType } from '@nestjs/graphql';

/** Lets the gateway check that this subgraph is federated. Replace it with the module's real types. */
@ObjectType('GoalsFederationTest')
export class FederationTest {
  @Field()
  federated!: boolean;

  @Field()
  goals!: boolean;
}
