import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Goal {
  @Field(() => ID)
  id!: string;

  @Field()
  title!: string;

  @Field()
  completed!: boolean;
}
