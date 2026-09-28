---
name: EAS pnpm v11 configuration
description: pnpm 11's workspace locations for overrides and dependency build-script approvals used by EAS installs.
---

Keep workspace-wide overrides in `pnpm-workspace.yaml`, not the root `package.json` `pnpm.overrides` field. Use the `allowBuilds` map for dependency install scripts instead of `onlyBuiltDependencies`; explicitly allow only trusted build scripts and set intentionally blocked packages to `false`.

**Why:** EAS builders can use pnpm 11, which ignores those legacy package.json/workspace settings and fails frozen installs when the lockfile reflects the ignored overrides. It also fails installs for build scripts that are neither allowed nor explicitly denied.

**How to apply:** When EAS reports `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` or `ERR_PNPM_IGNORED_BUILDS`, check its pnpm version, migrate settings to `pnpm-workspace.yaml`, regenerate the lockfile, and verify a frozen install with the same pnpm release.

Declare pnpm 11 in the root `package.json` `packageManager` field. Without that declaration, EAS can select pnpm 8, which ignores lockfile version 9 and cannot resolve `catalog:` dependency specifiers.

For a pnpm-only `preinstall` guard, identify pnpm from the basename of `npm_execpath` (`pnpm`, `pnpm.cjs`, or `pnpm.mjs`) rather than `npm_config_user_agent`. During pnpm 11's automatic install lifecycle, `npm_execpath` is present while `npm_config_user_agent` may be absent, even though a direct `pnpm run` supplies the user-agent variable.