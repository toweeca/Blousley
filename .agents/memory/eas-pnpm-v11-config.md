---
name: EAS pnpm v11 configuration
description: pnpm 11's workspace locations for overrides and dependency build-script approvals used by EAS installs.
---

Keep workspace-wide overrides in `pnpm-workspace.yaml`, not the root `package.json` `pnpm.overrides` field. Use the `allowBuilds` map for dependency install scripts instead of `onlyBuiltDependencies`; explicitly allow only trusted build scripts and set intentionally blocked packages to `false`.

**Why:** EAS builders can use pnpm 11, which ignores those legacy package.json/workspace settings and fails frozen installs when the lockfile reflects the ignored overrides. It also fails installs for build scripts that are neither allowed nor explicitly denied.

**How to apply:** When EAS reports `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` or `ERR_PNPM_IGNORED_BUILDS`, check its pnpm version, migrate settings to `pnpm-workspace.yaml`, regenerate the lockfile, and verify a frozen install with the same pnpm release.