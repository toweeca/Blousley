---
name: Replit AI Integrations gateway (modelfarm)
description: How AI integration secrets propagate and how to diagnose "ApiKey not approved"
---

# Replit AI Integrations gateway

Both OpenAI and Gemini AI integrations share ONE modelfarm proxy token (env vars
`AI_INTEGRATIONS_*_API_KEY` resolve to the same value) routed by path at
`http://localhost:1106/modelfarm/<provider>`.

## "ApiKey not approved" (HTTP 401, oauth.v2.ApiKeyNotApproved)
If the gateway returns this for BOTH providers, it is an account/workspace-level
entitlement issue (AI Integrations not approved / no credits), NOT a code or
stale-secret problem. Cannot be fixed from code.

## Env-secret propagation rule
`setupReplitAIIntegrations` / `setEnvVars` write to the secret store, but already
running processes keep their old env. A **workflow restart DOES pick up the new
store values** (verified: set a throwaway env var, restart workflow, read
`/proc/<pid>/environ` — the new var appears). So if a restarted workflow still
shows the old/short token value, that value IS the real provisioned one, and any
gateway rejection is account-level, not propagation.

**Why:** spent a long debugging loop assuming the 15-char token was stale; the
set-var+restart+/proc test proved restarts refresh env, isolating the failure to
gateway entitlement.
