# Versioning policy

This repository follows [Semantic Versioning 2.0.0](https://semver.org/) for its public contract.
The version of a release applies to the whole package: the manager app, the launcher, the background
service and their interfaces.

## The public contract

The version number describes compatibility of these interfaces:

- the manager app to the background service (the `/api/*` HTTP surface and its capability token), including
  the `minService`/`apiVersion` handshake in `app/version.json`;
- the launcher, picker and notify pages to the service API;
- the service to LG's installer (package layout, install metadata, `packageinfo.json`);
- stored data a new version must read: `config.json`, the Live TV cache, learned remote keys, the update
  channel and the rollback copy (`app.prev`);
- the HBC repository feed shape and the release asset names;
- upgrade paths between published releases (a change that requires a manual SSH step on configured TVs is
  not a silent patch).

Settings, playlists and the token must keep working across patch and minor releases.

## How a release gets its number

The compatibility impact is a **pull-request label**, applied by the author and checked by CI:

| Label | Meaning | Version |
|---|---|---|
| `semver:patch` | Backward-compatible bug fix; no new public functionality | `Z` + 1 |
| `semver:minor` | New backward-compatible functionality, or a deprecation | `Y` + 1, `Z` = 0 |
| `semver:major` | Incompatible change to anything in the public contract above; the PR explains the migration | `X` + 1, `Y.Z` = 0 |
| `semver:none` | No application release: tests, CI, editorial documentation | no release |

Exactly one label is required; CI (`SemVer` workflow) rejects a PR with none, several, or an unknown one, and
validates the [Release Drafter](https://github.com/release-drafter/release-drafter) configuration and category
match. On merge, the Release workflow asks Release Drafter (pinned to the reviewed 7.10.0 commit) to resolve
the version from the merged PR labels against the last published release, and `tools/release.py` only
**validates** that output against LG's installer limits (stable `X.Y.Z`, at most nine digits per component) —
it no longer guesses from commit messages. Words like `[FEATURE]` in a commit subject have no effect.

## Pre-releases

Test builds for a TV's *Update channel* are published explicitly and tagged `test-<branch>` as pre-releases;
they do not participate in the stable `X.Y.Z` sequence. SemVer pre-release identifiers (`-rc.1`) are not
currently produced by automation.

## Rules for maintainers

- A published release is immutable: fix forward, never rewrite a tag or re-upload different bytes.
- A breaking change must include its migration steps in the PR description and release notes.
- Documentation-only, CI-only and test-only changes take `semver:none` unless they change the public contract
  (for example a documented feed field or an installer requirement).
- If a change ships in a patch but turns out to break the contract, release a corrective version and document
  the mistake in the notes; never edit the published release.
