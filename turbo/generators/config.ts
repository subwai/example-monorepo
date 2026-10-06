import type { PlopTypes } from '@turbo/gen';

import { newGenerator } from './new.ts';
import { readRepo } from './shared/repo.ts';
import { library } from './variants/library.ts';
import { nestModule } from './variants/nestModule.ts';
import { proto } from './variants/proto.ts';
import { service } from './variants/service.ts';
import { subgraph } from './variants/subgraph.ts';

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  const repo = readRepo(plop.getPlopfilePath());
  const variants = [library(repo), nestModule(repo), proto(repo), service(repo), subgraph(repo)];

  plop.setGenerator('new', newGenerator(variants));
  for (const { kind, description, prompts, actions } of variants) {
    plop.setGenerator(kind, { description, prompts, actions });
  }
}
