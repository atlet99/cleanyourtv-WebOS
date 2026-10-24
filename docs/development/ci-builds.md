# IPK builds in GitHub Actions

These workflows build **atlet99's fork** of [lasharor/cleanyourtv-WebOS](https://github.com/lasharor/cleanyourtv-WebOS).
Local installation of Python, npm or the webOS SDK is not required to download a CI package.

## Every push to main

The **Build IPK** workflow (`.github/workflows/build-ipk.yml`) runs on **every push to `main`**, including documentation-only pushes.
It can also be started from **Actions → Build IPK → Run workflow**. Leave the application directory empty for CleanYourTV.

The workflow:

1. Checks the service, security and localisation on Node.js 8.12.0, matching webOS 5.
2. Prepares the existing files with `ipk/build.py` and builds the complete IPK with `@atlet99/webos-packager-plugin/core` 2.2.0. Python also creates the standalone launcher archive.
3. Signs the checksums when both release keys are configured and verifies them during the build.
4. Verifies SHA-256 checksums and uploads the output as a downloadable artifact.

Open [Build IPK](https://github.com/atlet99/cleanyourtv-WebOS/actions/workflows/build-ipk.yml), choose a successful run and download
**Artifacts → webos-ipk-…**. Unzip the download; the `.ipk` file is the TV package. GitHub artifact downloads require a GitHub login.
The artifact also contains the launcher archive, checksums and available signatures. Artifacts are retained for **30 days**.
The run summary contains the artifact link and signing status. Every build records its commit in `BUILD`.

This workflow builds artifacts; it does not publish a stable GitHub Release or change the updater's release channel.
Public end-user downloads that should remain available belong in [Releases](https://github.com/atlet99/cleanyourtv-WebOS/releases).

## Signing setup

| GitHub setting | Name |
|---|---|
| Actions secret | `CYTV_RELEASE_PRIVATE_KEY` |
| Actions variable | `CYTV_RELEASE_PUBLIC_KEY_PEM` |

Both contain the PEM contents described in [Signed releases](signed-releases.md). Private keys are written only to a private
temporary directory on the runner, deleted afterwards and never included in the artifact.
With neither key configured, the workflow produces an **unsigned development build** that can be installed explicitly with
Homebrew Channel or `ares-install`; automatic CleanYourTV updates still require signed releases.
Configuring only one of the two keys fails the build instead of silently downgrading to unsigned output.

## Packaging another webOS application

The reusable composite action lives in `.github/actions/package-webos/` and uses
[`@atlet99/webos-packager-plugin` 2.2.0](https://www.npmjs.com/package/@atlet99/webos-packager-plugin/v/2.2.0), a fork of
`@webosbrew/webos-packager-plugin` originally by kitsuned (Andrey Smirnov).

All IPK workflows use the public `/core` API, without webpack. `setup.sh` copies the dedicated tooling manifest and lockfile
into a fresh `$RUNNER_TEMP` directory and runs `npm ci --omit=peer --ignore-scripts` there.
Nothing is installed globally or added to the TV app's dependencies. Tooling is removed after the workflow/action finishes.
Node.js 22 is used for build tooling; this does not change the JavaScript runtime shipped on the TV.

For a prepared app inside this checkout, **Run workflow** accepts:

- `app-directory`: folder containing `appinfo.json`, its `main` page, `icon` and prepared assets;
- `service-directories`: optional JS service folders, one per line, each with `services.json` and `package.json`.

Service IDs must start with the app ID followed by a dot, for example `com.example.app.service` for `com.example.app`.
The generic Action accepts **one app and optional JS services per invocation**; the same library also builds CleanYourTV's multi-app IPK.
It is a packager: it does not compile an arbitrary app framework,
generate missing assets, install on a TV or require a connected TV. Source assets are copied verbatim without minification.
Symbolic links are rejected. This mode produces an IPK and SHA-256 checksum, without a CleanYourTV release signature.

### Use the action in another workflow

```yaml
jobs:
  package:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      # Run your app's own build first if these are not already prepared assets.
      - uses: atlet99/cleanyourtv-WebOS/.github/actions/package-webos@main
        id: package
        with:
          app-directory: build/app
          service-directories: |
            build/service
          output-directory: dist
      - uses: actions/upload-artifact@v4
        with:
          name: my-webos-app
          path: |
            dist/*.ipk
            dist/*.sha256
```

The action output `steps.package.outputs.ipk` is the absolute path to the generated package.
From this repository's own workflow, use `./.github/actions/package-webos` as shown in `build-ipk.yml`.

## CleanYourTV's multi-app package

CleanYourTV's package contains **three application namespaces** (manager, input picker and notification window), a root service,
boot scripts and native helper binaries. The existing Python entry point prepares/inlines those assets and passes a manifest to
`ipk/pack.cjs`, which uses `IPKBuilder` from `/core` with `primaryApp: com.cleanyourtv.manager`.
The library generates the IPK container and its internal archives. `ipk/build-ipk.py` is retained as a compatibility command and delegates to the same
standalone library through the generic packager.

Explicit modes preserve executable scripts/binaries as `0755` and the shared library as `0644`.
CleanYourTV uses fixed nonzero `mtime: 1761000000` for the IPK and standalone launcher; both are byte-reproducible for identical inputs.
The generic Action preserves source file permission bits, honours `SOURCE_DATE_EPOCH`, and uses the same nonzero timestamp when it is unset.
Release checksums and signatures are still created and verified by `ipk/build.py`.

## Optional local tooling

CI performs installation automatically. For local packaging/checks, keep dependencies in a dedicated temporary directory:

```sh
tooling=$(mktemp -d)
cp .github/actions/package-webos/package.json .github/actions/package-webos/package-lock.json "$tooling/"
(cd "$tooling" && npm ci --cache "$tooling/npm-cache" --ignore-scripts --omit=peer --no-audit --no-fund)
NODE_PATH="$tooling/node_modules" python3 ipk/build.py
# When finished:
rm -rf "$tooling"
```

The tooling manifest pins version **2.2.0**, and the lockfile pins its dependency tree. It is not a runtime dependency of the TV app.

## Local action check (optional)

To check the generic action after installing its tooling into an isolated directory:

```sh
NODE_PATH=/path/to/isolated/node_modules python3 .github/actions/package-webos/check.py
```

The check packages an app with and without a service, inspects the archive, verifies UTF-8 assets, explicit permissions/timestamps,
byte reproducibility, the legacy command and SHA-256, and rejects symbolic links and unrelated service IDs. It never contacts a TV.
`tools/package-check.py`, with the same `NODE_PATH`, checks the full signed multi-app package and launcher too.

## References

- [LG webOS CLI installation](https://webostv.developer.lge.com/develop/tools/cli-installation): the official package is `@webos-tools/cli`.
- [LG packaging guide](https://webostv.developer.lge.com/develop/tools/cli-dev-guide#ares-package): `ares-package APP_DIR SERVICE_DIR`, package inspection and service naming.
- [Current CLI package metadata](https://registry.npmjs.org/@webos-tools%2fcli/latest): CLI 3.2.6 requires Node.js 20 or newer; the older Node 14–16 recommendation on the installation page is not current for this release.
- [Standalone plugin API](https://github.com/atlet99/webos-packager-plugin): `/core`, multi-app packaging, explicit permissions and reproducible timestamps.
