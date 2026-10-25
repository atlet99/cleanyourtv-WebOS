"""Read and validate CleanYourTV's install metadata without extracting files to disk."""
import io
import json
from pathlib import Path, PurePosixPath
import re
import tarfile

PACKAGE = 'com.cleanyourtv.manager'
VERSION = re.compile(r'(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\Z')
PAYLOAD = 'usr/palm/applications/' + PACKAGE + '/root/'


def validate_manager_ipk(file):
    file = Path(file)
    if file.stat().st_size > 64 * 1024 * 1024:
        raise ValueError('IPK exceeds the 64 MiB metadata-check limit')
    data = file.read_bytes()
    if not data.startswith(b'!<arch>\n'):
        raise ValueError('Not an IPK/ar archive')
    offset, parts = 8, {}
    while offset < len(data):
        header = data[offset:offset + 60]
        if len(header) != 60 or header[-2:] != b'`\n':
            raise ValueError('Invalid IPK member header')
        name, size = header[:16].decode('ascii').strip().rstrip('/'), int(header[48:58])
        offset += 60
        if name in parts or size < 0 or offset + size > len(data):
            raise ValueError('Duplicate or truncated IPK member')
        parts[name] = data[offset:offset + size]
        offset += size + size % 2
    if parts.get('debian-binary') != b'2.0\n' or 'data.tar.gz' not in parts:
        raise ValueError('Missing IPK format marker or data archive')
    names, files, metadata = set(), set(), {}
    app_path = 'usr/palm/applications/' + PACKAGE + '/appinfo.json'
    package_path = 'usr/palm/packages/' + PACKAGE + '/packageinfo.json'
    with tarfile.open(fileobj=io.BytesIO(parts['data.tar.gz']), mode='r|gz') as archive:
        for member in archive:
            name = PurePosixPath(member.name).as_posix()
            if member.offset_data + member.size > 128 * 1024 * 1024 or len(names) >= 4096:
                raise ValueError('IPK exceeds metadata-check limits')
            if member.size < 0 or name in names or name.startswith('/') or '..' in PurePosixPath(name).parts or not (member.isfile() or member.isdir()):
                raise ValueError('Unsafe or duplicate IPK path: ' + name)
            names.add(name)
            if member.isfile():
                files.add(name)
            if name in (app_path, package_path):
                if not member.isfile() or member.size > 65536:
                    raise ValueError('Invalid install metadata: ' + name)
                metadata[name] = json.load(archive.extractfile(member))
    app, package = metadata.get(app_path), metadata.get(package_path)
    if not isinstance(app, dict) or not isinstance(package, dict):
        raise ValueError('Missing manager app/package metadata')
    if app.get('id') != PACKAGE or package.get('id') != PACKAGE or package.get('app') != PACKAGE:
        raise ValueError('Manager app/package identities do not match')
    if not isinstance(app.get('version'), str) or not VERSION.fullmatch(app['version']) or package.get('version') != app['version']:
        raise ValueError('Manager app/package versions do not match')
    if app.get('type') != 'web' or not isinstance(app.get('title'), str) or not app['title'].strip():
        raise ValueError('Invalid manager application type/title')
    for field in ['main', 'icon']:
        value = app.get(field)
        if not isinstance(value, str) or value.startswith('/') or '..' in PurePosixPath(value).parts or 'usr/palm/applications/' + PACKAGE + '/' + value not in files:
            raise ValueError('Missing or invalid manager ' + field)
    if package.get('services', []) != []:
        raise ValueError('CleanYourTV declares Luna services, but its root daemon is started by init.d')
    if any(name.startswith('usr/palm/services/') for name in names):
        raise ValueError('Root payload must be manager app resources, not a Luna service directory')
    for required in ['bootstrap.sh', 'helper/helper.js', 'helper/security.js']:
        if PAYLOAD + required not in files:
            raise ValueError('Missing root payload file: ' + required)
    return package
