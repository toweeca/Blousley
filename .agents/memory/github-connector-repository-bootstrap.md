---
name: GitHub connector repository bootstrap
description: Reliable full-repository uploads through the GitHub connector when direct Git credentials are unavailable.
---

For a completely empty GitHub repository, create one file through the Contents API before using the Git Database blob, tree, commit, and reference endpoints. Keep connector blob uploads below the enforced request-rate limit, and use an explicit printable delimiter when passing `git ls-tree` output through shell callbacks.

**Why:** GitHub returns `409 Git Repository is empty` for blob creation before the first Contents API commit. The connector also enforces a requests-per-second limit, and shell callback processing may remove tab separators.

**How to apply:** Bootstrap the target branch with the Contents API, upload unique blobs with low concurrency and backoff for HTTP 429, create the complete tree and desired commit, then update the branch reference. Use a delimiter such as `|` in formatted tree listings.