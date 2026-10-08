# Agent guidance

- Read the root [README](README.md) first: it explains the JIT and compiled package shapes and how each tool
  resolves them.
- Create packages, services and api-rspack subgraphs with the generators (`pnpm gen`, see [turbo/README.md](turbo/README.md)),
  never by copying an existing workspace.
- Import a workspace's own modules through its `imports` map (`#some/module`), not relative paths.
- Third-party versions belong in the pnpm catalog; reference them as `"catalog:"`.
- Workspace scripts run `labuild` (`check`, `build`, `test`, `dev`, `run`); configs extend `@example/labuild/*`. Add a
  tool to labuild rather than to individual workspaces.
- Run apps with `pnpm start` (overmind; see packages/interactive-bootstrapper). New services belong in
  `packages/sears-catalog`; regenerate the Procfile with `pnpm codegen`.
- Verify with `pnpm check`, `pnpm test` and `pnpm build` (turbo runs them for every affected workspace).

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
