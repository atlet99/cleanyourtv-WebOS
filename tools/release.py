#!/usr/bin/env python3
"""Validate Release Drafter output and publish signed IPKs. Version calculation belongs to the Action."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent
# LG appinfo.json accepts stable X.Y.Z only, with at most nine ASCII digits per component.
VERSION = re.compile(r'(0|[1-9][0-9]{0,8})\.(0|[1-9][0-9]{0,8})\.(0|[1-9][0-9]{0,8})\Z')
LABELS = {'semver:major', 'semver:minor', 'semver:patch', 'semver:none'}


def run(*args, root=ROOT, **kwargs):
    return subprocess.run(args, cwd=root, text=True, stdout=subprocess.PIPE, check=True, **kwargs).stdout.strip()


def git(*args, root=ROOT):
    return run('git', *args, root=root)


def version(value):
    if not isinstance(value, str) or not VERSION.fullmatch(value):
        raise ValueError('Release version must be an LG-compatible stable X.Y.Z: ' + str(value))


def check_pr_labels(labels):
    selected = [label for label in labels if label.startswith('semver:')]
    if len(selected) != 1 or selected[0] not in LABELS:
        raise ValueError('Apply exactly one PR label: ' + ', '.join(sorted(LABELS)))
    return selected[0]


def tag_commit(tag, root=ROOT):
    result = subprocess.run(['git', 'rev-parse', '--verify', 'refs/tags/' + tag + '^{commit}'], cwd=root, text=True, capture_output=True)
    return result.stdout.strip() if result.returncode == 0 else None


def marker(sha):
    return '<!-- cleanyourtv-release:' + sha + ' -->'


def prepare(repo, resolved_version, tag, notes, labels, root=ROOT):
    if not re.fullmatch(r'[\w.-]+/[\w.-]+', repo):
        raise ValueError('Invalid GitHub repository')
    head = git('rev-parse', 'HEAD', root=root)
    if not isinstance(labels, list) or any(not isinstance(label, str) or label not in LABELS for label in labels):
        raise ValueError('Unexpected Release Drafter label output')
    if not (set(labels) - {'semver:none'}):
        return {'publish': False, 'reason': 'No merged PRs marked for an application release', 'source': head, 'repo': repo}
    version(resolved_version)
    if tag != 'v' + resolved_version or not isinstance(notes, str) or not notes.strip():
        raise ValueError('Release Drafter version, tag or notes are inconsistent')
    target = tag_commit(tag, root)
    if target not in (None, head):
        raise ValueError('Calculated tag already belongs to another commit; refusing to move it')
    notes = notes.rstrip() + '\n\nBuild commit: `' + head + '`.\n\n' + marker(head) + '\n'
    return {'publish': True, 'version': resolved_version, 'tag': tag, 'source': head, 'repo': repo, 'notes': notes}


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
    parser.add_argument('command', choices=['check-pr', 'prepare', 'publish'])
    parser.add_argument('--repo', default=os.environ.get('GITHUB_REPOSITORY', ''))
    parser.add_argument('--plan', type=Path)
    parser.add_argument('--public-key', type=Path)
    args = parser.parse_args()
    if args.command == 'check-pr':
        event = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())
        print(check_pr_labels([label['name'] for label in event['pull_request']['labels']]))
        return
    if args.plan is None:
        parser.error('--plan is required for prepare/publish')
    if args.command == 'prepare':
        data = prepare(args.repo, os.environ.get('SEMVER_VERSION', ''), os.environ.get('SEMVER_TAG', ''),
                       os.environ.get('SEMVER_NOTES', ''), json.loads(os.environ.get('SEMVER_LABELS') or '[]'))
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
