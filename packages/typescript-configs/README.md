# @example/typescript-configs

The compiler options behind [`labuild`](../labuild)'s tsconfigs. Workspaces extend labuild's entry points, not
these files directly:

| Config | labuild entry point | For |
| --- | --- | --- |
| `node/tsconfig.json` | `@example/labuild/node/tsconfig.json` | Node packages and apps: `nodenext` resolution, decorators with metadata (Nest). |
| `node/tsconfig.build.json` | `@example/labuild/node/tsconfig.build.json` | Compiled Node packages: emits `src` to `dist` with declarations. |
| `browser/tsconfig.json` | `@example/labuild/browser/tsconfig.json` | Frontend packages and apps: `bundler` resolution, `react-jsx`, Vite types. |
| `browser/tsconfig.build.json` | `@example/labuild/browser/tsconfig.build.json` | Compiled frontend packages. |

Both base configs set `customConditions: ["development"]`, so TypeScript resolves every workspace package,
compiled or JIT, to its `src`. Type-checking never needs a build.
