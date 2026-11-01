# Fit API update readiness

## Decision

**Validated locally, but not cleared for publishing under the current constraints.**

No application API source, database schema, Stripe credentials, webhook logic,
quote values, acceptance rules, Ideas code, or diagnostic settings were changed
during this preparation. Nothing was published, committed, or pushed.

The only executable-code change in this preparation is additional coverage in
`artifacts/api-server/tests/fit-conversations.test.mjs`. Tests are not imported
into the runtime server bundle.

## Confirmed production blockers

Read-only production metadata shows that `public.conversations` lacks:

- `fit_quote_cents`
- `fit_stripe_checkout_session_id`
- `fit_paid_at`
- The unique index on `fit_stripe_checkout_session_id` declared by the workspace schema.

All three fields exist in development. The current handlers and database model
require them. Publishing the current API without compatible storage can break
chat/list queries as well as quotes and payments. Under the instruction not to
change the schema, this remains a blocker; no migration was attempted.

The existence of the published authenticated quote handler is **not conclusively
confirmed**. An unauthenticated 401 is returned by global authentication before
routing, so it cannot distinguish an existing route from a missing route.
The prior production investigation found only 4xx responses for recent quote
requests, not enough detail to prove an authenticated 404.

Rejected, non-mutating webhook probes found:

- The stable API alias returned 401 JSON with `Authentication required`, both
  with no signature and with an invalid synthetic signature.
- The primary custom domain returned 404 at the webhook path.
- Current workspace code instead registers the webhook before session middleware
  and rejects missing/invalid signatures with 400.

Thus the published webhook path does not currently expose the expected
session-independent handler. No real webhook event was sent to production.

## Local validation

| Check | Result |
| --- | --- |
| Mobile typecheck | Passed |
| All mobile tests | 24 passed |
| API auth diagnostics + complete fit-conversation/payment suite | 24 passed |
| API production build | Passed |
| Built bundle contains quote, payment-summary and fit-Checkout paths | Confirmed |
| Extra API typecheck | Failed: 14 existing errors |

The API typecheck errors concern missing generated Gemini declarations, a
`sleeveLength` type mismatch, and incomplete Express-handler return paths.
These were not repaired because this preparation does not authorize unrelated
behavior or dependency changes. The configured esbuild production build succeeds
independently of that typecheck.

The suite validates session-derived identity, assigned-tailor/customer permissions,
duplicate-conversation prevention, CAD integer-cent quote storage, quote locking
after Checkout starts, test-mode Checkout metadata, Checkout reuse, paid-state
guards, and private design-image authorization.

Added webhook tests exercise the actual HTTP route and application handler using
signed synthetic events and the real Stripe SDK signature verifier. StripeSync's
managed-secret lookup/event persistence is isolated in the test process only.
Both completion event types, invalid signatures, live events, unpaid events,
wrong currency/amount/session/participants, and idempotent duplicate delivery are
covered. Disposable development fixtures are cleaned up.

This is **not** a completed hosted-card payment or proof of managed Stripe-to-
production webhook delivery.

## Intended fit-feature behavior already in the workspace

| Route | Current workspace behavior | Runtime source |
| --- | --- | --- |
| `POST /api/chat/conversations` | Creates/reuses and assigns a fit conversation | `artifacts/api-server/src/routes/chat/index.ts` |
| `GET /api/chat/conversations/:id/payment` | Participant-authorized quote/payment/design summary | Same file |
| `POST /api/chat/conversations/:id/quote` | Assigned tailor stores a CAD quote and inserts a chat message | Same file |
| `POST /api/chat/conversations/:id/fit-checkout` | Assigned customer starts/reuses test-mode CAD Checkout | Same file |
| `GET /api/tailor/customers` | Tailor-scoped requests, assignment, image and quote/payment summaries | `artifacts/api-server/src/routes/tailor/index.ts` |
| `GET /api/images/fits/:fitId` | Authorized private saved-design image | `artifacts/api-server/src/routes/images/index.ts` |
| `POST /api/stripe/webhook` | Signature-verified test-event confirmation with stored-session/quote/participant matching | `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/webhookHandlers.ts` |

The quote route is an added feature endpoint in the existing workspace source;
it was not added or modified during this preparation. Whether publishing would
add it to production or replace an older implementation cannot be certified
without an authenticated production response or the serving source revision.
The deployment metadata available did not provide that source revision.

The feature is intended to be additive, but a blanket backward-compatibility
claim is unsafe while production storage is incompatible and the precise
published-source diff is unavailable. Existing routes and client request fields
have not been removed by this preparation.

## Publishing scope and files

Publishing is **not a single-route patch**. The current API build bundles
`artifacts/api-server/src/index.ts` into
`artifacts/api-server/dist/index.cjs`, including imported route modules, session/
security/RLS/private-image helpers, Stripe client/webhook modules, and shared
database/API validators. In particular:

- `artifacts/api-server/src/index.ts`
- `artifacts/api-server/src/app.ts`
- `artifacts/api-server/src/routes/index.ts`
- Every route source listed in the inventory below
- `artifacts/api-server/src/lib/auth.ts`
- `artifacts/api-server/src/lib/authDiagnostics.ts`
- `artifacts/api-server/src/lib/security.ts`
- `artifacts/api-server/src/lib/rls.ts`
- `artifacts/api-server/src/lib/privateImages.ts`
- `artifacts/api-server/src/stripeClient.ts`
- `artifacts/api-server/src/webhookHandlers.ts`
- Imported shared code from `lib/db`, `lib/api-zod`, and the AI integration libraries

The API artifact uses `pnpm --filter @workspace/api-server run build`, then
`node artifacts/api-server/dist/index.cjs`, with `/api/healthz` for startup health.

The mobile artifact also has production build/run services in its existing
manifest. The current project Publish configuration therefore includes both
services, not an isolated API-only release. No artifact settings were changed.
An Android APK rebuild is separate from this web/API publication.

### Complete explicit API route inventory

All paths below are present in current source. This is not a claim that all are
new or changed relative to the unknown published source.

| Source under `artifacts/api-server/src/` | Methods and routes |
| --- | --- |
| `routes/auth.ts` | `POST /api/auth/register`; `POST /api/auth/login`; `POST /api/auth/logout`; `GET /api/auth/me` |
| `routes/blouse/design.ts` | `POST /api/blouse/design`; `GET /api/blouse/design` |
| `routes/blouse/index.ts` | `POST /api/blouse/analyze`; `GET /api/blouse/fits`; `POST /api/blouse/fits`; `GET /api/blouse/fits/:id`; `PATCH /api/blouse/fits/:id/find-tailor`; `DELETE /api/blouse/fits/:id`; `PATCH /api/blouse/fits/:id/notes` |
| `routes/chat/index.ts` | `GET /api/chat/conversations/:id/payment`; `POST /api/chat/conversations/:id/quote`; `POST /api/chat/conversations/:id/fit-checkout`; `GET /api/chat/conversations`; `GET /api/chat/conversations/:id/idea`; `POST /api/chat/conversations`; `GET /api/chat/messages`; `POST /api/chat/conversations/:id/images`; `POST /api/chat/messages`; `PATCH /api/chat/messages/read` |
| `routes/generate-blouse-image/index.ts` | `POST /api/generate-blouse-image/text`; `POST /api/generate-blouse-image/style`; `POST /api/generate-blouse-image/sketch` |
| `routes/health.ts` | `GET /api/healthz` |
| `routes/ideas/index.ts` | `GET /api/ideas`; `POST /api/ideas`; `POST /api/ideas/:id/checkout`; `POST /api/ideas/:id/accept`; `PATCH /api/ideas/:id/share`; `DELETE /api/ideas/:id` |
| `routes/images/index.ts` | `GET /api/images/fits/:fitId`; `GET /api/images/chat/:conversationId/:messageId` |
| `routes/measurements/index.ts` | `GET /api/measurements/me`; `POST /api/measurements/me` |
| `routes/preferences/index.ts` | `GET /api/preferences`; `POST /api/preferences` |
| `routes/tailor/index.ts` | `GET /api/tailor/customers`; `POST /api/tailor/fits`; `GET /api/tailor/profile`; `PUT /api/tailor/profile` |
| `routes/users/index.ts` | `POST /api/users/me` |
| `app.ts` | `POST /api/stripe/webhook`; `GET /api/ideas/checkout/success`; `GET /api/ideas/checkout/cancel`; `GET /api/diag`; `GET /api/proof`; `GET /api/diag-capture`; `GET /api/diag3d`; `GET /api/diag-grid` |

Ideas and all other existing modules above are included by the normal API build;
their source and behavior were not changed during this preparation.

## Publishing prerequisites, including Stripe

1. **Storage approval is required separately.** The missing fields and index must
   exist before current handlers can safely serve production. For Replit-managed
   storage, Publish reviews/applies development-to-production schema differences.
   Do not publish while schema changes remain prohibited; do not accept unrelated
   renames, drops, or other migrations. No custom migration script was added.
2. **Stripe connection is present, but publisher readiness is not established.**
   The integration registry reports Stripe `ready`. That does not prove that the
   publishing dialog's production-account connection requirement has been met.
   Official Replit documentation says the Stripe publishing flow can block until
   a live Stripe account/production connection is supplied.
3. **Do not resolve that gate by changing this app to live mode.** Existing code
   explicitly accepts only the backend test-mode credential and rejects live
   webhook events. If Publish demands live credentials, stop and resolve a
   supported test-only deployment path before proceeding. No live or placeholder
   keys were requested, installed, or used.
4. **Production runtime settings must preserve test mode and session continuity.**
   Confirm the production environment has the existing test-mode Stripe settings,
   database configuration, and session configuration without exposing or rotating
   their values. Their production values were not read during preparation.
5. **Managed webhook delivery must reach the API without a user session.**
   Confirm registration targets the API alias's `/api/stripe/webhook`, with both
   completion event types and signature verification. Read-only inspection of the
   workspace test Stripe account found only a matching development-host webhook,
   not a verified stable-host registration. This does not establish configuration
   in any other Stripe account. No webhook configuration was changed.
6. **Validate the serving backend after an authorized release.** Check an
   authenticated quote POST, then a real test-mode payment and managed webhook
   confirmation. Neither can be replaced by an unauthenticated 401 probe.

Documentation consulted:

- https://docs.replit.com/features/monetization/stripe-payments
- https://docs.replit.com/use-cases/accept-payments-with-stripe
- https://docs.replit.com/features/data-and-storage/development-and-production

## Rollback and APK order

No production data or schema was modified by this preparation, so there is no
production rollback to perform.

A future release is not low-risk as a code-only update against today's
production schema. After any separately authorized additive storage change,
prefer retaining added fields on a code rollback rather than dropping quote or
payment data. An older backend can restore the original quote failure and may
not confirm outstanding Checkout sessions; preserve webhook compatibility and
reconcile in-flight test sessions.

Resolve prerequisites and publish/verify the compatible backend **before**
rebuilding the diagnostic APK for acceptance testing. A new APK cannot add a
missing backend route or storage fields. If an APK already contains the current
quote UI, a backend correction alone may restore sending; the newer Hub-image
and response-handling changes still require the updated mobile bundle.

The current prepared mobile version remains `1.0.3`, Android version code `4`,
using profile `fit-checkout-diagnostics` and the stable API alias. Diagnostics
remain enabled for that profile.
