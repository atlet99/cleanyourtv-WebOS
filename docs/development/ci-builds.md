# Checks, automatic releases and IPK builds

These workflows belong to **atlet99's fork** of [lasharor/cleanyourtv-WebOS](https://github.com/lasharor/cleanyourtv-WebOS).
Users download stable packages from [Releases](https://github.com/atlet99/cleanyourtv-WebOS/releases); no local build tools are needed.

## Pull requests

**CI** runs on every pull request to `main`. The reusable **Checks** workflow performs:

1. ESLint correctness checks for service/build JavaScript and the TV's inline ES5 scripts.
2. Ruff Python checks and actionlint/ShellCheck validation of workflows and CI shell scripts.
3. Release-planning/publication tests using a temporary Git repository and a fake GitHub API.
4. The complete service, security and localisation suite on Node.js 8.12.0, matching webOS 5.
5. Standalone packager tests and a signed multi-app build using disposable test keys, including release-version substitution.
6. A strict documentation build and upload of unsigned preview IPKs/checksums as `checked-ipk-<sha>` artifacts, retained for seven days.

PR jobs have read-only repository permissions and no production signing keys. This includes fork PRs.
They do not publish releases or create tags, and their artifacts are not reused for production signing.
Enable the successful **CI → checks → Lint, test and build** check in the `main` ruleset after the first run to require it before merging.
The Release workflow independently requires the same checks even for direct pushes to `main`.

## After merging into main

**Release** runs on every push to `main`, runs the reusable checks again for that exact commit and publishes only after they succeed.
The workflow can also be rerun or manually started on `main`.

`tools/release.py` compares application/packaging paths with the latest published stable release:

| Commit convention | Version increment |
|---|---|
| `feat:`, `feat(scope):`, `[FEATURE]`, `[ADD]` | Minor |
| `type!:`, `type(scope)!:`, `BREAKING CHANGE:` footer, `[BREAKING]` | Major |
| Other changes to application/packaging files, including `fix:` and `[FIX]` | Patch |
| Documentation/CI-only changes or no remaining code diff | No IPK release |

The highest increment among relevant commits wins. The first release uses the service's current development version as a floor.
The planner ignores prereleases, produces grouped notes with commit/comparison links, and does not alter tracked source files.
No npm publishing, Nix job, PAT or bot version commit is required. The normal `GITHUB_TOKEN` with `contents: write` is used only in the release job.

For a releasable change, the job installs the locked **`@atlet99/webos-packager-plugin/core` 2.2.0** in a private temporary directory,
builds the production files with the planned version, signs and verifies their SHA-256 files, and creates a draft release at the checked commit.
Only after all six assets are uploaded and their state/size/SHA-256 digests are verified is the release published with its `vX.Y.Z` tag.
GitHub's semantic-version-aware latest selection prevents a concurrently published higher version being replaced as latest by an older one.
It does not depend on a second workflow being triggered by a bot-created tag.

Release runs are serialised. If `main` advances during the build/upload, publication is skipped and a later checked run aggregates
the remaining changes. Published stable tags/releases are never rewritten. An interrupted upload can reuse this workflow's own matching draft;
a conflicting existing tag or manual draft reserves that version and causes the planner to select a new patch number.
Production publication is never tested by contacting GitHub from the regression suite: its API is faked there.

The release job exposes `new_release_published` and `new_release_version` for future downstream jobs.
After a successful main release job, it explicitly calls the Documentation workflow to rebuild both the site and `/repo/`.
This does not rely on the `release` event, which GitHub suppresses for releases created with `GITHUB_TOKEN`.
Pages builds/deployments are serialised together; the feed is always generated after the clean documentation build.
Main pushes reach Pages through Release rather than a second competing push-triggered deployment.
Downloads use an explicit latest-release tag, and API/download/verification failures stop deployment instead of removing the feed.
Only the public verification key is passed to the called Pages workflow, never the private signing key.

## Signing setup

| GitHub setting | Name |
|---|---|
| Actions secret | `CYTV_RELEASE_PRIVATE_KEY` |
| Actions secret or variable | `CYTV_RELEASE_PUBLIC_KEY_PEM` |

Both contain the PEM contents described in [Signed releases](signed-releases.md).
The public key can be stored in Secrets or Variables; if both are set, the Secret takes precedence.
Stable releases **require both keys**. Missing/invalid keys fail the release job before a tag or public release is created.
Private key files are kept only in a private temporary runner directory and deleted after signing.
CI preview packages use fresh temporary test keys for verification and leave only unsigned preview output.

## Release versions and local reproduction

A stable release has one version for the package, runtime service and frontend.
`CYTV_RELEASE_VERSION=X.Y.Z` sets that version during asset preparation, including the embedded service constant,
frontend version JSON, launcher constant and minimum required service. No version changes are committed back to `main`.
Checking out an exact stable `vX.Y.Z` tag also selects that version automatically.
If a commit has multiple stable tag aliases, the highest is selected unless `CYTV_RELEASE_VERSION` is supplied explicitly.
An untagged development build keeps the existing service/frontend versions in the source files.
`BUILD` records the exact checked source commit; updating the version does not change the source commit being released.

## Manual packages and branch previews

**Build IPK** (`build-ipk.yml`) remains a manual workflow for local-style packages or another prepared app.
Download its `webos-ipk-…` artifact from the run; it is retained for 30 days and requires a GitHub login.
It does not publish a stable release. Without signing keys it can build unsigned development packages.

The former automatic branch publisher (`test-build.yml`) is removed. Branch pull requests produce preview artifacts only;
the TV's optional test-channel feature still recognises explicitly published signed `test-*` prereleases, but ordinary CI never creates them.

## Reusable generic packaging Action

`.github/actions/package-webos/` packages one prepared app and optional JS service folders using the same standalone `/core` API.
Service IDs must start with the app ID followed by a dot. `app-directory` must contain `appinfo.json`, its main page, icon and prepared assets;
`service-directories` accepts one path per line, each with `services.json` and `package.json`.

```yaml
steps:
  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
  # Run your app's build first if needed.
  - uses: ./.github/actions/package-webos
    id: package
    with:
      app-directory: build/app
      service-directories: |
        build/service
      output-directory: dist
  - uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
    with:
      name: my-webos-app
      path: |
        dist/*.ipk
        dist/*.sha256
```

The output `steps.package.outputs.ipk` is the absolute IPK path. In another repository, reference
`atlet99/cleanyourtv-WebOS/.github/actions/package-webos` at a reviewed full commit SHA instead of a moving branch.
The library is a fork of `@webosbrew/webos-packager-plugin`, originally by kitsuned (Andrey Smirnov).

## Tool isolation and pinned Actions

External Actions are pinned to verified full commit SHAs, with release versions in comments. Their JavaScript runtime is Node 24;
build tooling uses Node 22, while the TV compatibility suite still uses Node 8.12.0.
Dependabot proposes Action pin updates through pull requests; they must pass the same checks.
The pin change does not silently change the project's Node/Python target versions.

Npm packages are installed with lockfiles into `$RUNNER_TEMP`, with lifecycle scripts disabled. Webpack is not installed.
Python linters/documentation tools and the pinned actionlint binary also live in runner-temporary directories.
The TV package contains none of these build dependencies.

## Optional local checks

CI performs installation automatically. To reproduce packaging locally without global npm installation:

```sh
tooling=$(mktemp -d)
cp .github/actions/package-webos/package.json .github/actions/package-webos/package-lock.json "$tooling/"
(cd "$tooling" && npm ci --cache "$tooling/npm-cache" --ignore-scripts --omit=peer --no-audit --no-fund)
NODE_PATH="$tooling/node_modules" python3 tools/package-check.py
NODE_PATH="$tooling/node_modules" python3 .github/actions/package-webos/check.py
python3 tools/release-check.py
rm -rf "$tooling"
```

`ipk/build.py` prepares assets/launcher/signatures; `ipk/pack.cjs` delegates the multi-app IPK container to the library.
The generic Action and legacy `ipk/build-ipk.py` command use the same core. Explicit modes preserve executables as `0755`, libraries
as `0644`, and fixed nonzero timestamps keep the packages reproducible. The generic Action also honours `SOURCE_DATE_EPOCH`.
The CleanYourTV root payload is manager-app data (`com.cleanyourtv.manager/root/`), so `packageinfo.services` stays empty.
Package checks and feed generation validate the actual IPK metadata. A checksum alone cannot establish installability.

References: [GitHub CLI release creation](https://cli.github.com/manual/gh_release_create),
[plugin 2.2.0](https://www.npmjs.com/package/@atlet99/webos-packager-plugin/v/2.2.0),
[LG packaging guide](https://webostv.developer.lge.com/develop/tools/cli-dev-guide#ares-package).
