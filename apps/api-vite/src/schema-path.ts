import { join } from 'node:path';

/**
 * In development each GraphQL server writes its schema to `@example/api-graphql-schema`, which the gateway's
 * supergraph config reads. Elsewhere the schema stays in memory.
 */
export const schemaPath = (name: string): string | undefined =>
  process.env.NODE_ENV === 'development'
    ? join(process.cwd(), 'node_modules/@example/api-graphql-schema/schemas/__generated__', `${name}.graphql`)
    : undefined;
