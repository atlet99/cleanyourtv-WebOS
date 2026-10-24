#!/usr/bin/env python3
"""Plan and publish signed IPK releases. Planning is read-only; publishing is explicit."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
VERSION = re.compile(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)\Z')
PREFIXES = ('app/', 'manager/', 'picker/', 'notify/', 'helper/', 'scripts/', 'shared/', 'themes/', 'third-party/', 'voice/', 'ipk/')
FILES = {'compat.json', 'config.example.json', 'install.sh', 'uninstall.sh', 'LICENSE', 'THIRD-PARTY.md',
         '.github/actions/package-webos/package.json', '.github/actions/package-webos/package-lock.json', '.github/actions/package-webos/setup.sh'}


def run(*args, root=ROOT, **kwargs):
    return subprocess.run(args, cwd=root, text=True, stdout=subprocess.PIPE, check=True, **kwargs).stdout.strip()


def git(*args, root=ROOT):
    return run('git', *args, root=root)


def version(value):
    match = VERSION.fullmatch(value)
    if not match:
        raise ValueError('Invalid stable release version: ' + value)
    return tuple(map(int, match.groups()))


def bump(value, kind):
    major, minor, patch = version(value)
    return '.'.join(map(str, (major + 1, 0, 0) if kind == 'major' else (major, minor + 1, 0) if kind == 'minor' else (major, minor, patch + 1)))


def releasable(name):
    return name in FILES or (name.startswith(PREFIXES) and name != 'themes/README.md')


def change_kind(subject, body=''):
    if re.search(r'(^|\n)BREAKING[ -]CHANGE:', body) or re.match(r'\w+(?:\([^)]*\))?!:', subject) or subject.upper().startswith('[BREAKING]'):
        return 'major'
    if re.match(r'feat(?:\([^)]*\))?:', subject, re.I) or re.match(r'\[(FEATURE|ADD)\]', subject, re.I):
        return 'minor'
    return 'patch'


def tag_commit(tag, root=ROOT):
    result = subprocess.run(['git', 'rev-parse', '--verify', 'refs/tags/' + tag + '^{commit}'], cwd=root, text=True, capture_output=True)
    return result.stdout.strip() if result.returncode == 0 else None


def marker(sha):
    return '<!-- cleanyourtv-release:' + sha + ' -->'


def plan(repo, releases, root=ROOT):
    if not re.fullmatch(r'[\w.-]+/[\w.-]+', repo):
        raise ValueError('Invalid GitHub repository')
    head = git('rev-parse', 'HEAD', root=root)
    stable = [r for r in releases if not r['draft'] and not r['prerelease'] and r['tag_name'].startswith('v') and VERSION.fullmatch(r['tag_name'][1:])]
    previous = max(stable, key=lambda r: version(r['tag_name'][1:])) if stable else None
    base = previous['tag_name'] if previous else ''
    if base:
        if not tag_commit(base, root) or subprocess.run(['git', 'merge-base', '--is-ancestor', base, head], cwd=root).returncode:
            raise ValueError('Latest published release is not an ancestor of this commit')
        changed = git('diff', '--name-only', '-z', base, head, root=root).split('\0')
    else:
        changed = git('ls-files', '-z', root=root).split('\0')
    if not any(releasable(name) for name in changed):
        return {'publish': False, 'reason': 'No application or packaging changes since the latest release', 'source': head, 'repo': repo}
    revisions = base + '..' + head if base else head
    commits = []
    for sha in git('rev-list', '--no-merges', revisions, root=root).splitlines():
        paths = git('diff-tree', '--root', '--no-commit-id', '--name-only', '-r', '-z', sha, root=root).split('\0')
        if any(releasable(name) for name in paths):
            subject = git('show', '-s', '--format=%s', sha, root=root)
            body = git('show', '-s', '--format=%b', sha, root=root)
            commits.append((sha, subject, change_kind(subject, body)))
    if not commits:
        commits.append((head, git('show', '-s', '--format=%s', head, root=root), 'patch'))
    kind = max((c[2] for c in commits), key={'patch': 0, 'minor': 1, 'major': 2}.get, default='patch')
    source_version = re.search(r"const VERSION = '([^']+)'", (root / 'helper/helper.js').read_text()).group(1)
    version(source_version)
    next_version = max([bump(base[1:], kind), source_version], key=version) if base else source_version
    aliases = [tag[1:] for tag in git('tag', '--points-at', head, '--list', 'v*', root=root).splitlines() if VERSION.fullmatch(tag[1:])]
    next_version = max([next_version] + aliases, key=version)
    drafts = {r['tag_name']: r for r in releases if r['draft']}
    while True:
        tag = 'v' + next_version
        target = tag_commit(tag, root)
        draft = drafts.get(tag)
        if (target is None or target == head) and (not draft or marker(head) in (draft.get('body') or '')):
            break
        next_version = bump(next_version, 'patch')
    lines = ['# ' + tag, '', 'Initial release of this fork.' if not base else 'Changes since ' + base + '.', '']
    for label, level in [('Breaking changes', 'major'), ('Features', 'minor'), ('Fixes and other changes', 'patch')]:
        selected = [c for c in commits[:100] if c[2] == level]
        if selected:
            lines += ['## ' + label, ''] + ['- ' + subject + ' ([' + sha[:7] + '](https://github.com/' + repo + '/commit/' + sha + '))' for sha, subject, _ in selected] + ['']
    if len(commits) > 100:
        lines += ['Additional commits are included in the comparison below.', '']
    if base:
        lines += ['[Full comparison](https://github.com/' + repo + '/compare/' + base + '...' + tag + ')', '']
    lines += ['Build commit: `' + head + '`.', '', marker(head)]
    return {'publish': True, 'version': next_version, 'tag': tag, 'source': head, 'base': base, 'repo': repo, 'notes': '\n'.join(lines) + '\n'}


def gh_json(*args):
    return json.loads(run('gh', *args))


def releases(repo):
    return [item for page in gh_json('api', '--paginate', '--slurp', 'repos/' + repo + '/releases?per_page=100') for item in page]


def remote_tag(repo, tag):
    matches = gh_json('api', 'repos/' + repo + '/git/matching-refs/tags/' + tag)
    ref = next((r['object'] for r in matches if r['ref'] == 'refs/tags/' + tag), None)
    for _ in range(8):
        if ref is None or ref['type'] == 'commit':
            return ref['sha'] if ref else None
        ref = gh_json('api', 'repos/' + repo + '/git/tags/' + ref['sha'])['object']
    raise ValueError('Cannot resolve release tag')


def publish(data, public_key, root=ROOT):
    if data.get('publish') is not True:
        return False
    repo, tag, sha = data['repo'], data['tag'], data['source']
    if repo != os.environ.get('GITHUB_REPOSITORY') or tag != 'v' + data['version'] or git('rev-parse', 'HEAD', root=root) != sha:
        raise ValueError('Release plan does not match the checked-out repository/commit')
    if git('status', '--porcelain', '--untracked-files=no', root=root):
        raise ValueError('Tracked sources changed after checkout; refusing publication')
    version(data['version'])
    main = lambda: gh_json('api', 'repos/' + repo + '/git/ref/heads/main')['object']['sha']
    if main() != sha:
        print('Main advanced; the next checked commit will include these changes')
        return False
    target = remote_tag(repo, tag)
    if target not in (None, sha):
        raise ValueError('Refusing to replace a tag pointing to another commit')
    existing = next((r for r in releases(repo) if r['tag_name'] == tag), None)
    if existing and not existing['draft']:
        print('Release is already published; nothing is overwritten')
        return False
    if existing and marker(sha) not in (existing.get('body') or ''):
        raise ValueError('Refusing to replace a manually created draft')
    assets = []
    for name in ['com.cleanyourtv.manager_' + data['version'] + '_all.ipk', 'frontend-' + data['version'] + '.tgz']:
        asset = root / 'dist' / name
        checksum, signature = Path(str(asset) + '.sha256'), Path(str(asset) + '.sha256.sig')
        expected = hashlib.sha256(asset.read_bytes()).hexdigest() + '  ' + name + '\n'
        if checksum.read_text() != expected:
            raise ValueError('Release checksum does not match ' + name)
        run('openssl', 'dgst', '-sha256', '-verify', str(public_key), '-signature', str(signature), str(checksum))
        assets += [asset, checksum, signature]
    if {p.name for p in (root / 'dist').iterdir()} != {p.name for p in assets}:
        raise ValueError('Unexpected release output files')
    notes = root / 'dist' / 'release-notes.tmp'
    try:
        notes.write_text(data['notes'])
        if not existing:
            run('gh', 'release', 'create', tag, '--repo', repo, '--draft', '--target', sha, '--title', tag, '--notes-file', str(notes))
        run('gh', 'release', 'upload', tag, '--repo', repo, '--clobber', *map(str, assets))
        uploaded = next(r for r in releases(repo) if r['tag_name'] == tag)
        if {a['name'] for a in uploaded['assets']} != {p.name for p in assets}:
            raise ValueError('Draft does not contain exactly the checked release assets')
        for asset in assets:
            remote = next(a for a in uploaded['assets'] if a['name'] == asset.name)
            digest = 'sha256:' + hashlib.sha256(asset.read_bytes()).hexdigest()
            if remote.get('state') != 'uploaded' or remote['size'] != asset.stat().st_size or remote.get('digest') != digest:
                raise ValueError('Uploaded release asset differs: ' + asset.name)
        if main() != sha:
            print('Main advanced during upload; keeping the release as a draft')
            return False
        if remote_tag(repo, tag) not in (None, sha):
            raise ValueError('Release tag changed during upload')
        run('gh', 'api', '--method', 'PATCH', 'repos/' + repo + '/releases/' + str(uploaded['id']),
            '-F', 'draft=false', '-f', 'make_latest=legacy', '-f', 'target_commitish=' + sha)
        if remote_tag(repo, tag) != sha:
            raise ValueError('Published tag does not match the build commit')
        return True
    finally:
        notes.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['plan', 'publish'])
    parser.add_argument('--repo', default=os.environ.get('GITHUB_REPOSITORY', ''))
    parser.add_argument('--plan', type=Path, required=True)
    parser.add_argument('--public-key', type=Path)
    args = parser.parse_args()
    if args.command == 'plan':
        data = plan(args.repo, releases(args.repo))
        args.plan.write_text(json.dumps(data))
        result = {'publish': str(data['publish']).lower(), 'version': data.get('version', ''), 'tag': data.get('tag', '')}
    else:
        if not args.public_key:
            parser.error('--public-key is required for publication')
        data = json.loads(args.plan.read_text())
        result = {'published': str(publish(data, args.public_key)).lower()}
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
            for key, value in result.items():
                output.write(key + '=' + value + '\n')
    print(json.dumps(result))


if __name__ == '__main__':
    main()
