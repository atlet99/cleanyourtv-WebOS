# Signed releases and local API access

Updates require an RSA/SHA-256 signature of the **exact `.sha256` file**, including the asset name.
Publish `asset`, `asset.sha256` and `asset.sha256.sig` (binary signature) together.
Missing keys, missing signatures, wrong signatures and mismatched asset names stop installation.
The public key is never downloaded from the release being verified.

## Maintainer setup

Generate a release identity once, outside the checkout. The `/secure` directory below must already exist
and be accessible only to the maintainer:

```sh
umask 077
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out /secure/release-private.pem
openssl pkey -in /secure/release-private.pem -pubout -out /secure/release-public.pem
```

Keep the private key offline or in a protected CI secret. Publish the public key and its fingerprint through a
trusted channel. This repository deliberately contains no generated production signing identity.

```sh
NODE_PATH=/path/to/isolated/node_modules \
CYTV_RELEASE_VERSION=1.5.14 \
CYTV_SIGNING_KEY=/secure/release-private.pem \
CYTV_RELEASE_PUBLIC_KEY=/secure/release-public.pem \
python3 ipk/build.py
```

The standalone packager 2.2.0 must be available in the isolated `NODE_PATH`; see [Tooling setup](ci-builds.md#optional-local-checks).
GitHub Actions sets this up automatically. The build verifies its signatures and bundles the public key with the service. Without `CYTV_SIGNING_KEY`,
the result is an **unsigned development build**, which the updater refuses.
For automatic stable releases and explicitly requested test builds, configure GitHub Actions secret `CYTV_RELEASE_PRIVATE_KEY` and an Actions secret or repository variable
`CYTV_RELEASE_PUBLIC_KEY_PEM` with the PEM contents (the public-key Secret takes precedence over the Variable). Protect publishing branches: a workflow with access
to the secret can sign a release. Pull-request checks never receive production keys.
The [Release workflow](ci-builds.md) publishes a checked commit only after both assets and signatures have been uploaded successfully.

## First installation and migration

Copy the trusted public key through SSH, then run a locally reviewed installer:

```sh
scp /secure/release-public.pem root@192.168.1.50:/home/root/cytv-release-public.pem
scp install.sh root@192.168.1.50:/home/root/cytv-install.sh
ssh root@192.168.1.50 'CYTV_RELEASE_KEY=/home/root/cytv-release-public.pem sh /home/root/cytv-install.sh'
```

Do not fetch the key from the release being installed. Existing installations can migrate with this command too.
Update the service package before the standalone launcher: launcher 1.4.13 requires service 1.5.13 or newer.
Only launchers marked `apiVersion: 2` support the authenticated API; older saved launchers are not offered for rollback.
Restart the TV once after migration so previously injected input hooks reopen their logs in the private directory.
Subsequent updates use the key bundled in the installed service. Key rotation requires an update signed by the
previously trusted key or explicit local replacement. Older services do not gain enforcement until replaced.
`CYTV_IPK` remains an explicit local-package option for development; it does not authenticate that local package.

## Local API

Every request to `127.0.0.1:8765`, including GETs, requires `X-CYTV-Token`.
The 256-bit token is stored in `api-token` (mode `0600`) and never returned over HTTP.
TV apps obtain it through `PalmServiceBridge` and the Homebrew Channel root service.
Neither `Origin: null` nor an absent Origin grants access. HTTP(S) origins are refused even with a token.

```sh
TOKEN=$(node /media/developer/cleanyourtv/security.js token)
curl -H "X-CYTV-Token: $TOKEN" http://127.0.0.1:8765/api/manager/status
```

Only image GET endpoints accept query capabilities because `<img>` cannot set a custom header.
The LAN notification endpoint on port 8767 retains its separate Bearer token.
Existing scripts must add the header. Request bodies are limited to 64 KiB.

Service, input-hook, setup, share-log and offline-update logs now live under
`/media/developer/cleanyourtv/run` (mode `0700`), rather than predictable shared `/tmp` files.
Package downloads use private unique directories. The microphone socket in `/tmp` belongs to LG.

## Russian interface

A Russian TV locale (`ru`, `ru-RU`) selects Russian menus automatically; other languages retain their dictionaries.
Manager, player diagnostics, input picker and system voice cards use `shared/i18n.js`.
Phone setup/report pages follow the phone browser's language. App names, model IDs, URLs, tokens, user text and
external answers are not translated. The **English-only** speech model is labelled accordingly: UI localisation
does not add Russian speech recognition. API fields and raw diagnostic logs remain stable for scripts.
