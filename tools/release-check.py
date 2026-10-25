#!/usr/bin/env python3
"""Release regression check: temporary Git history/keys and a fake GitHub API; never publishes."""
import hashlib
import os
from pathlib import Path
import subprocess
import tempfile
import yaml

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
    config = yaml.safe_load((release.ROOT / '.github/release-drafter.yml').read_text())
    rules = {c['when']['label']: c['semver-increment'] for c in config['categories'] if 'title' in c}
    assert rules == {'semver:major': 'major', 'semver:minor': 'minor', 'semver:patch': 'patch'}
    assert config['tag-template'] == 'v$RESOLVED_VERSION' and config['tag-prefix'] == 'v'
    assert any(c.get('type') == 'pre-include' and set(c['when']['labels']) == set(rules) for c in config['categories'])
    assert any(c.get('type') == 'pre-exclude' and c['when'].get('label') == 'semver:none' for c in config['categories'])
    assert all('conventional' not in c.get('when', {}) for c in config['categories'])
    for label in release.LABELS:
        assert release.check_pr_labels(['bug', label]) == label
    for invalid in [[], ['semver:patch', 'semver:minor'], ['semver:patch', 'semver:none'], ['semver:feature']]:
        try:
            release.check_pr_labels(invalid)
            raise AssertionError('an ambiguous/missing PR impact was accepted')
        except ValueError:
            pass
    assert not release.prepare('owner/project', '', '', '', [], root)['publish']
    assert not release.prepare('owner/project', '', '', '', ['semver:none'], root)['publish']
    # These are Action outputs, not versions computed by the repository. A FEATURE word cannot change the supplied patch.
    for resolved, label in [('1.7.1', 'semver:patch'), ('1.8.0', 'semver:minor'), ('2.0.0', 'semver:major')]:
        result = release.prepare('owner/project', resolved, 'v' + resolved, '[FEATURE] internal compatibility bug fix', [label], root)
        assert result['version'] == resolved and result['source'] == initial
    for invalid in ['01.7.1', '1.07.1', '1.7.01', '1.7', 'v1.7.1', '1.7.1-rc.1', '1.7.1+sha.a1', '1.2٣.4', '1.1000000000.0']:
        try:
            release.version(invalid)
            raise AssertionError('an unsupported LG package version was accepted')
        except ValueError:
            pass
    git('tag', 'v1.8.0', initial)
    commit('Update code without any release keywords', 'app/index.html', '<p>fixed</p>')
    before = git('tag', '--list')
    try:
        release.prepare('owner/project', '1.8.0', 'v1.8.0', 'Changes', ['semver:minor'], root)
        raise AssertionError('a reserved tag on another commit was accepted')
    except ValueError as error:
        assert 'another commit' in str(error)
    data = release.prepare('owner/project', '1.7.1', 'v1.7.1', 'Fixes', ['semver:patch'], root)
    assert data['notes'].endswith(release.marker(data['source']) + '\n')
    assert before == git('tag', '--list'), 'preparation must not create tags'
    print('ok   SemVer integration: PR intent, native label rules, Action output validation, LG format and immutable tags')

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
        if args[1] == 'api':
            assert 'PATCH' in args and 'make_latest=legacy' in args and 'draft=false' in args
            state['published'] += 1
            state['releases'][0]['draft'] = False
            state['tag'] = data['source']
            return ''
        operation = args[2]
        if operation == 'create':
            state['releases'].append({'id': 1, 'tag_name': data['tag'], 'draft': True, 'body': data['notes'], 'assets': []})
        elif operation == 'upload':
            state['releases'][0]['assets'] = [{'name': p.name, 'state': 'uploaded', 'size': p.stat().st_size,
                                              'digest': 'sha256:' + ('0' * 64 if state['corrupt'] else hashlib.sha256(p.read_bytes()).hexdigest())} for p in dist.iterdir() if p.name != 'release-notes.tmp']
        else:
            raise AssertionError('Unexpected GitHub write: ' + str(args))
        return ''

    try:
        os.environ['GITHUB_REPOSITORY'] = 'owner/project'
        release.run, release.gh_json, release.releases = fake_run, fake_json, lambda repo: state['releases']
        assert not release.publish({'publish': False}, public, root)
        state['main'] = 'b' * 40
        assert not release.publish(data, public, root) and not state['releases']
        state['main'] = data['source']
        tracked = root / 'helper/helper.js'
        original_source = tracked.read_text()
        tracked.write_text('modified after checks')
        try:
            release.publish(data, public, root)
            raise AssertionError('modified tracked sources were accepted')
        except ValueError as error:
            assert 'Tracked sources changed' in str(error)
        tracked.write_text(original_source)
        asset = dist / ('frontend-' + data['version'] + '.tgz')
        original_bytes = asset.read_bytes()
        asset.write_bytes(b'tampered')
        try:
            release.publish(data, public, root)
            raise AssertionError('tampered local asset was accepted')
        except ValueError as error:
            assert 'checksum' in str(error)
        assert not state['releases']
        asset.write_bytes(original_bytes)
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
