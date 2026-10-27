---
name: Native cookie transport boundary
description: Why native explicit session cookies and browser-cookie authentication use different credential modes.
---

Do not mix Android's automatic cookie jar with explicitly attached session cookies on HTTP requests. Keep browser requests on `credentials: "include"`.

**Why:** React Native Android's OkHttp cookie jar can replace an explicit Cookie header. Source inspection also showed that native WebSockets append jar cookies alongside custom headers, rather than replacing them. A cached account profile or passing transport unit test is not evidence that Android has a valid API session.

**How to apply:** Preserve the distinction when changing authenticated transports. Scope manually attached cookies to the configured API origin. Native WebSockets must not open using only a local account identity when the secure session is absent. Confirm native session handling on a device before claiming an Android auth issue is resolved.
