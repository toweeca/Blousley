---
name: GitHub connector repository bootstrap
description: Reliable full-repository uploads through the GitHub connector when direct Git credentials are unavailable.
---

When direct Git credentials are unavailable, use the authenticated GitHub connector's Git Database API for an atomic commit: create blobs, a tree based on the current branch tree, and a commit whose parent is the current branch head; update the branch reference with `force: false`. Re-read the ref before mutation and verify it afterward. For a completely empty repository, bootstrap one file through the Contents API first. Keep blob uploads below the connector's request-rate limit.

**Why:** Direct Git pushes may lack credentials even when the GitHub connector is authorized. GitHub rejects blob creation in empty repositories, and connector writes are rate-limited; an unconditional or forced ref update could overwrite concurrent work.

**How to apply:** Read the target ref and parent tree, serialize blob uploads with backoff for HTTP 429, create the intended tree and commit, then update the ref without force. If the head changes, rebuild from the new head. Verify the final ref and compare the commit's changed paths with the requested allowlist.