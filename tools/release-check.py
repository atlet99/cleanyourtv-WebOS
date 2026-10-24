#!/usr/bin/env python3
"""Release regression check: temporary Git history/keys and a fake GitHub API; never publishes."""
import hashlib
import os
from pathlib import Path
import subprocess
import tempfile

import release


with tempfile.TemporaryDirectory(prefix='cytv-release-') as directory:
    root = Path(directory)
    identity = dict(os.environ, GIT_AUTHOR_NAME='Test', GIT_AUTHOR_EMAIL='test@example.invalid',
                    GIT_COMMITTER_NAME='Test', GIT_COMMITTER_EMAIL='test@example.invalid')

    def git(*args):
        return subprocess.check_output(['git', *args], cwd=root, env=identity, text=True).strip()

    def commit(subject, file, text, body=''):
        target = root / file
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text)
        git('add', file)
        git('commit', '-q', '-m', subject, '-m', body)
        return git('rev-parse', 'HEAD')

    git('init', '-q', '-b', 'main')
    initial = commit('Initial implementation', 'helper/helper.js', "const VERSION = '1.5.13';\n")
    first = release.plan('owner/project', [], root)
    assert first['version'] == '1.5.13' and first['source'] == initial
    git('tag', 'v1.5.13')
    published = [{'tag_name': 'v1.5.13', 'draft': False, 'prerelease': False}]
    assert not release.plan('owner/project', published, root)['publish']
    commit('docs: explain setup', 'docs/index.md', 'Docs only')
    assert not release.plan('owner/project', published, root)['publish']
    commit('fix(player): retry stream', 'app/index.html', '<p>fixed</p>')
    assert release.plan('owner/project', published, root)['version'] == '1.5.14'
    commit('[FEATURE] - add a setting;', 'shared/new.js', 'var setting = true;')
    assert release.plan('owner/project', published, root)['version'] == '1.6.0'
    commit('refactor!: change service contract', 'helper/new.js', 'var api = 2;')
    assert release.plan('owner/project', published, root)['version'] == '2.0.0'
    assert release.change_kind('fix: update', 'BREAKING CHANGE: incompatible format') == 'major'
    assert release.change_kind('feat(ui): new view') == 'minor'
    assert release.change_kind('[FIX] - retry;') == 'patch'
    git('tag', 'v2.0.0', initial)
    data = release.plan('owner/project', published, root)
    assert data['version'] == '2.0.1', 'existing tags must never be replaced'
    before = git('tag', '--list')
    draft = {'tag_name': 'v2.0.1', 'draft': True, 'prerelease': False, 'body': 'manual draft'}
    assert release.plan('owner/project', published + [draft], root)['version'] == '2.0.2'
    draft['body'] = release.marker(data['source'])
    assert release.plan('owner/project', published + [draft], root) == data
    assert before == git('tag', '--list'), 'planning must not create tags'
    assert 'retry stream' in data['notes'] and 'add a setting' in data['notes']
    assert release.releasable('.github/actions/package-webos/package-lock.json')
    assert not release.releasable('.github/workflows/release.yml')
    assert not release.releasable('themes/README.md')
    print('ok   release planning: first version, no-op/docs, patch/minor/major, legacy subjects, reserved tags and draft retries')

    private, public = root / 'private.pem', root / 'public.pem'
    subprocess.run(['openssl', 'genrsa', '-out', str(private), '2048'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run(['openssl', 'rsa', '-in', str(private), '-pubout', '-out', str(public)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    dist = root / 'dist'
    dist.mkdir()
    for name in ['com.cleanyourtv.manager_' + data['version'] + '_all.ipk', 'frontend-' + data['version'] + '.tgz']:
        asset = dist / name
        asset.write_bytes(b'fixture package contents')
        checksum = Path(str(asset) + '.sha256')
        checksum.write_text(hashlib.sha256(asset.read_bytes()).hexdigest() + '  ' + name + '\n')
        subprocess.run(['openssl', 'dgst', '-sha256', '-sign', str(private), '-out', str(asset) + '.sha256.sig', str(checksum)], check=True)
    state = {'main': data['source'], 'tag': None, 'releases': [], 'published': 0, 'corrupt': True}
    original_run, original_json, original_releases = release.run, release.gh_json, release.releases
    old_repo = os.environ.get('GITHUB_REPOSITORY')

    def fake_json(*args):
        endpoint = args[-1]
        if endpoint.endswith('/git/ref/heads/main'):
            return {'object': {'sha': state['main']}}
        if '/git/matching-refs/tags/' in endpoint:
            return [{'ref': 'refs/tags/' + data['tag'], 'object': {'type': 'commit', 'sha': state['tag']}}] if state['tag'] else []
        raise AssertionError('Unexpected API request: ' + str(args))

    def fake_run(*args, **kwargs):
        if args[0] != 'gh':
            return original_run(*args, **kwargs)
        operation = args[2]
        if operation == 'create':
            state['releases'].append({'tag_name': data['tag'], 'draft': True, 'body': data['notes'], 'assets': []})
        elif operation == 'upload':
            state['releases'][0]['assets'] = [{'name': p.name, 'size': p.stat().st_size,
                                              'digest': 'sha256:' + ('0' * 64 if state['corrupt'] else hashlib.sha256(p.read_bytes()).hexdigest())} for p in dist.iterdir() if p.name != 'release-notes.tmp']
        elif operation == 'edit':
            state['published'] += 1
            state['releases'][0]['draft'] = False
            state['tag'] = data['source']
        else:
            raise AssertionError('Unexpected GitHub write: ' + str(args))
        return ''

    try:
        os.environ['GITHUB_REPOSITORY'] = 'owner/project'
        release.run, release.gh_json, release.releases = fake_run, fake_json, lambda repo: state['releases']
        state['main'] = 'b' * 40
        assert not release.publish(data, public, root) and not state['releases']
        state['main'] = data['source']
        try:
            release.publish(data, public, root)
            raise AssertionError('corrupted remote assets were accepted')
        except ValueError as error:
            assert 'Uploaded release asset differs' in str(error)
        assert state['published'] == 0 and state['releases'][0]['draft']
        state['corrupt'] = False
        assert release.publish(data, public, root)
        assert state['published'] == 1 and state['tag'] == data['source']
        assert not release.publish(data, public, root) and state['published'] == 1
        print('ok   publication: signed assets, stale-main guard, corrupt-upload rejection, draft recovery and idempotence (fake API only)')
    finally:
        release.run, release.gh_json, release.releases = original_run, original_json, original_releases
        if old_repo is None:
            os.environ.pop('GITHUB_REPOSITORY', None)
        else:
            os.environ['GITHUB_REPOSITORY'] = old_repo
