#!/usr/bin/env python3
"""按线上各服务的成功部署版本选择镜像；只读取白名单版本号，不执行 .env。"""
import json
import os
import re
import subprocess
from pathlib import Path

SERVICES = {
    'api': {'image': 'blog-api', 'context': './api', 'file': './api/Dockerfile'},
    'web': {'image': 'blog-web', 'context': './web', 'file': './web/Dockerfile'},
    'proxy': {'image': 'blog-proxy', 'context': '.', 'file': './Dockerfile.proxy'},
}
SHARED = {'deploy/compose.yaml', 'deploy/release.sh', 'scripts/plan-release.py'}


def affected(service, paths):
    roots = {'api': ('api/',), 'web': ('web/',), 'proxy': ('admin/',)}
    extra = {'api': set(), 'web': set(), 'proxy': {'Dockerfile.proxy', 'Caddyfile', 'deploy/Caddyfile', '.dockerignore'}}
    return any(p in SHARED or p in extra[service] or p.startswith(roots[service]) for p in paths)


def select(choice, versions, head):
    if choice not in {'auto', 'all', *SERVICES}:
        raise ValueError('未知服务选择')
    changes = {}
    for service in SERVICES:
        base = versions.get(service.upper() + '_IMAGE_TAG') or versions.get('IMAGE_TAG', '')
        if not re.fullmatch('[0-9a-f]{40}', base):
            return list(SERVICES)  # 首次上线必须构建全部服务。
        result = subprocess.run(['git', 'diff', '--name-only', '--no-renames', '-z', base, head], capture_output=True)
        if result.returncode:
            return list(SERVICES)  # 旧提交不可用时保守全量，避免漏构建。
        changes[service] = result.stdout.decode().strip('\0').split('\0')
    # 编排/发布逻辑升级需要整体应用，手动选择也不能混用不兼容的配置。
    if any(SHARED.intersection(paths) for paths in changes.values()):
        return list(SERVICES)
    if choice != 'auto':
        return list(SERVICES) if choice == 'all' else [choice]
    return [service for service in SERVICES if affected(service, changes[service])]


if __name__ == '__main__':
    versions = dict(line.split('=', 1) for line in Path('deployed-versions.env').read_text().splitlines() if '=' in line)
    selected = select(os.environ.get('SERVICE_CHOICE', 'auto'), versions, os.environ['GITHUB_SHA'])
    outputs = {
        'matrix': json.dumps({'include': [SERVICES[s] for s in selected]}),
        'services': ','.join(selected),
        'has_changes': str(bool(selected)).lower(),
        'api': str('api' in selected).lower(),
    }
    with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
        for key, value in outputs.items():
            f.write(f'{key}={value}\n')
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as f:
        f.write('## 本次构建 / 部署范围\n\n' + (', '.join(selected) or '无应用改动，跳过构建与部署') + '\n')
