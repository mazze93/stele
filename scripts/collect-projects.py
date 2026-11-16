#!/usr/bin/env python3
"""Collect public repository observations for Stele's philosopher-scribe."""
import argparse
import hashlib
import json
import os
import re
from pathlib import Path
import subprocess
import tempfile
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]


def github(path):
    result = subprocess.run(['gh', 'api', path], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError('GitHub observation unavailable for ' + path.split('/contents/')[0])
    return json.loads(result.stdout)


def collect():
    projects = []
    seen = set()
    for target in json.loads((ROOT / 'src/data/project-sources.json').read_text()):
        repository = target['repository']
        if not re.fullmatch(r'mazze93/[A-Za-z0-9_.-]+', repository) or target['projectId'] in seen:
            raise ValueError('Invalid or repeated project source')
        seen.add(target['projectId'])
        metadata = github('repos/' + repository)
        if metadata['visibility'] != 'public':
            raise ValueError('Only public repositories may enter the distributed catalog')
        commit = github('repos/' + repository + '/commits/' + metadata['default_branch'])
        sha = commit['sha']
        tree = github('repos/' + repository + '/git/trees/' + commit['commit']['tree']['sha'])
        files = {entry['path']: entry for entry in tree['tree'] if entry['type'] == 'blob'}
        sources = []
        for name in ['README.md', 'CLAUDE.md', 'AGENTS.md', 'package.json', 'pyproject.toml', 'Cargo.toml', 'Package.swift', 'AUTHORITY.md']:
            if name in files:
                sources.append({'path': name, 'gitBlob': files[name]['sha'],
                                'url': 'https://github.com/' + repository + '/blob/' + sha + '/' + name})
        observation = {
            'projectId': target['projectId'], 'repository': repository,
            'commit': sha, 'observedAt': datetime.now(timezone.utc).isoformat(),
            'description': metadata['description'] or '',
            'language': metadata['language'] or 'Unspecified',
            'sources': sources,
        }
        projects.append(observation)
    return {'schemaVersion': 1, 'kind': 'stele-project-observations', 'projects': projects}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'src/data/project-observations.json')
    args = parser.parse_args()
    report = collect()  # Fetch everything before replacing the last complete snapshot.
    args.output.parent.mkdir(parents=True, exist_ok=True)
    content = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    with tempfile.NamedTemporaryFile(mode='w', dir=args.output.parent, delete=False) as stream:
        stream.write(content)
        temporary = stream.name
    os.replace(temporary, args.output)
    print(f"Observed {len(report['projects'])} public repositories; sha256 {hashlib.sha256(content.encode()).hexdigest()}")


if __name__ == '__main__':
    main()
