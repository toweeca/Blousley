---
name: Stripe test Checkout
description: Test-only credentials and current Stripe Checkout API behavior encountered in Blousley.
---

Use the backend test-mode secret for Blousley test payments; do not assume the connected Stripe credential is in the same mode, and do not let payment setup failure take down unrelated API routes.

**Why:** the connected credential was not test-mode while the existing backend secret was. The user requires test-mode payments only.

**How to apply:** retain a strict test-key guard on payment clients, without exposing credentials or weakening API health.

Do not add `payment_method_types` to Checkout Session creation for the current Stripe API. Use Stripe's configured dynamic methods and handle both completed and asynchronous-payment-success events.

**Why:** Stripe rejected that parameter as no longer supported. Only handling immediate completion would leave delayed successful payments unopened.

**How to apply:** verify payment status, CAD currency, stored cents, customer metadata, and stored Checkout Session before opening a request.
