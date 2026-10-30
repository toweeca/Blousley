---
name: Cross-package code generation
description: Runtime-version inference and Metro cache pitfalls when regenerating shared API packages.
---

Match generated validator syntax to the installed validator runtime explicitly instead of trusting dependency auto-detection across workspace packages.

**Why:** Orval inferred a newer Zod API while importing the installed older runtime, causing the API server to fail during module import before tests could run. Changing the runtime just to accommodate generation would unnecessarily widen the scope.

**How to apply:** Preserve the installed runtime major in generator options when regenerating shared API contracts. Confirm the server can import the generated validators, not only that the mobile client typechecks.

If regeneration deletes and recreates an imported directory, Metro may retain an unresolved-module error even after the file exists again.

**Why:** The generator's clean-output step briefly removes shared client files while Metro is watching them.

**How to apply:** Finish generation first. If a missing-module error persists for an existing generated file, restart the managed mobile workflow once rather than rewriting imports or adding duplicate modules.
