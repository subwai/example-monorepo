# @example/design-system

React components and design tokens.

```tsx
import { Button, Card } from '@example/design-system';
```

A **JIT** package. It ships TypeScript source, and every consumer compiles it: Vite, rspack and vitest. Node
can't run it directly, so an app has to bundle it. `react` is a peer dependency.
