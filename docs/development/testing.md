# Testing and CI

## Service checks under Node 8

webOS 5 TVs ship Node.js 8.12. `tools/node8-check.sh` downloads that exact version (from nodejs.org, checksum verified, cached in
`~/.cache/cleanyourtv`) and runs `tools/node8-check.js` with it:

```sh
sh tools/node8-check.sh
```

The checks:

- parse every service file;
- load every module;
- run the compatibility layer against a local server (`http` requests, `mkdir -p`, `URL`, `randomInt`);
- run the Live TV pairing end to end: the code, a wrong code, saving the playlist, fetching and parsing it;
- run the update logic of the manager against a mock of the GitHub API: the stable and test channels, equal versions with different
  commits, and going back to stable.

Nothing leaves your machine. The script also runs on current Node: `node tools/node8-check.js`.

## Pages

Localisation checks run with `node tools/i18n-check.js` and inside the Node 8 suite. They compare key counts, exact key sets,
duplicates, empty entries and template parameters, and exercise manager menus and phone forms.
See [Localisation](localization.md) for coverage, adding languages and the reviewed key-set snapshot.

The pages are plain HTML with no build step, so they can be opened in a desktop Chrome with a small mock of the service on
`127.0.0.1:8765` and driven with scripted key events. That is how the launcher, Live TV and manager screens are checked before they
go to a TV. The mock needs to answer `/api/apps`, `/api/live/*` and `/api/manager/*` with the shapes in [Service API](../api.md).

!!! note "What cannot be checked on a computer"
    Playback of real streams, the TV's remote and pointer, the on-screen keyboard and anything that depends on LG's compositor
    need a TV.

## Continuous integration

| Workflow | When | What |
|---|---|---|
| `ci.yml` / `checks.yml` | Pull requests to `main`, or called from Release | ESLint, Ruff, actionlint/ShellCheck, release tests, Node 8 suite, packaging tests and strict docs build; unsigned preview artifacts only |
| `release.yml` | Push to `main`, or manual run on `main` | Requires checks, selects a semantic version, signs and verifies packages, uploads a draft and publishes it with its tag |
| `build-ipk.yml` | Manual run | Builds downloadable artifacts; can package another prepared app with the isolated plugin |
| `localization.yml` | Relevant pushes and pull requests, or manual run | Checks localisation dictionaries and rendering on Node 8.12.0 without release secrets |
| `docs.yml` | Called after successful Release, documentation PRs, manual run or stable release event | Builds the site and verified HBC feed together; PRs only validate |

Explicitly published signed test prereleases can appear in the manager app's **Update channel** list; CI previews are artifacts only.
See [Test builds](../managing.md#test-builds).
For automatic package builds, signing settings and the reusable packaging action, see [IPK builds in GitHub Actions](ci-builds.md).
Both main and test-branch IPK builds use the locked standalone packager **2.2.0**, installed only in the runner's temporary directory.
`NODE_PATH=/path/to/isolated/node_modules python3 tools/package-check.py` checks signatures, multi-app metadata, modes, timestamps and byte reproducibility.

## Documentation

```sh
python3 -m venv .venv && . .venv/bin/activate
pip install zensical
zensical serve      # http://localhost:8000, rebuilds on change
zensical build --clean
```
