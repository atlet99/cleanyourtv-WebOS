#!/usr/bin/env python3
"""Compatibility command: build-ipk.py <appdir> <out.ipk>, using standalone packager 2.2.0."""
import hashlib, os, pathlib, shutil, subprocess, sys, tempfile

app = pathlib.Path(sys.argv[1]).resolve()
target = pathlib.Path(sys.argv[2]).resolve()
script = pathlib.Path(__file__).resolve().parent.parent / '.github/actions/package-webos/package.cjs'
with tempfile.TemporaryDirectory(prefix='webos-ipk-') as directory:
    env = dict(os.environ, WEBOS_APP_DIRECTORY=str(app), WEBOS_OUTPUT_DIRECTORY=directory, WEBOS_SERVICE_DIRECTORIES='')
    subprocess.run(['node', str(script)], env=env, check=True)
    package = next(pathlib.Path(directory).glob('*.ipk'))
    shutil.copyfile(package, target)
    target.with_name(target.name + '.sha256').write_text(hashlib.sha256(target.read_bytes()).hexdigest() + '  ' + target.name + '\n')
