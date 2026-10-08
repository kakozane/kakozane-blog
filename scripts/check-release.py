#!/usr/bin/env python3
"""运行 python3 scripts/check-release.py：在临时 Git 仓库和模拟命令中验证发布，不连接线上。"""
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import sys

sys.dont_write_bytecode = True

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('plan', ROOT / 'scripts/plan-release.py')
plan = importlib.util.module_from_spec(spec)
spec.loader.exec_module(plan)


def git(*args):
    return subprocess.check_output(['git', *args], text=True).strip()


def commit(path, text):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)
    git('add', '.')
    git('commit', '-qm', 'fixture')
    return git('rev-parse', 'HEAD')


with tempfile.TemporaryDirectory() as temp:
    os.chdir(temp)
    git('init', '-q')
    git('config', 'user.email', 'test@example.com')
    git('config', 'user.name', 'Release test')
    base = commit('README.md', 'base')
    versions = {'IMAGE_TAG': base}
    go = commit('api/main.go', 'go change')
    assert plan.select('auto', versions, go) == ['api']
    Path('web').mkdir()
    git('mv', 'api/main.go', 'web/moved.go')
    git('commit', '-qm', 'cross service rename')
    assert plan.select('auto', {'IMAGE_TAG': go}, git('rev-parse', 'HEAD')) == ['api', 'web']
    git('reset', '--hard', go)
    admin = commit('admin/src/main.ts', 'admin change')
    assert plan.select('auto', versions, admin) == ['api', 'proxy']  # 未上线的 Go 不能遗漏。
    mixed = {'API_IMAGE_TAG': go, 'WEB_IMAGE_TAG': base, 'PROXY_IMAGE_TAG': admin}
    assert plan.select('auto', mixed, admin) == []
    web = commit('web/app.ts', 'web change')
    assert plan.select('auto', mixed, web) == ['web']
    docs = commit('README.md', 'docs only')
    assert plan.select('auto', {s.upper() + '_IMAGE_TAG': web for s in plan.SERVICES}, docs) == []
    assert plan.select('proxy', mixed, web) == ['proxy']
    assert plan.select('all', mixed, web) == list(plan.SERVICES)
    assert plan.select('auto', {}, web) == list(plan.SERVICES)
    assert plan.select('auto', {'IMAGE_TAG': 'f' * 40}, web) == list(plan.SERVICES)
    shared = commit('deploy/compose.yaml', 'shared change')
    assert plan.select('web', mixed, shared) == list(plan.SERVICES)
    assert plan.affected('proxy', ['deploy/Caddyfile'])
    assert plan.affected('proxy', ['.dockerignore'])
    assert not plan.affected('api', ['admin/src/main.ts'])

    # 用模拟 docker/curl/flock 验证真实 Bash 脚本的参数和版本保存，避免操作服务器。
    bin_dir = Path(temp) / 'bin'
    bin_dir.mkdir()
    for name, body in {
        'docker': '''echo "$*" >> "$COMMAND_LOG"
if [ "$1 $2" = "volume inspect" ]; then exit 1; fi
if [ "${FAIL_UP:-}" = 1 ]; then
  case "$*" in *" up "*) exit 1;; esac
fi
''',
        'curl': 'exit 0\n',
        'flock': 'exit 0\n',
    }.items():
        p = bin_dir / name
        p.write_text('#!/bin/sh\n' + body)
        p.chmod(0o755)
    script = (ROOT / 'deploy/release.sh').read_text().replace('cd /opt/blog', 'cd "$TEST_DEPLOY_DIR"', 1)
    runner = Path(temp) / 'release-test.sh'
    runner.write_text(script)
    for selected in ['api', 'web', 'proxy', 'api,web,proxy']:
        site = Path(temp) / selected
        stage = site / 'releases' / web
        stage.mkdir(parents=True)
        (site / '.env').write_text(f'IMAGE_TAG={base}\n')
        (site / 'config.yaml').write_text('')
        (site / 'Caddyfile').write_text('old proxy')
        (stage / 'compose.yaml').write_text((ROOT / 'deploy/compose.yaml').read_text())
        (stage / 'Caddyfile').write_text('new proxy')
        log = site / 'commands'
        env = os.environ | {'PATH': str(bin_dir) + ':' + os.environ['PATH'], 'COMMAND_LOG': str(log), 'TEST_DEPLOY_DIR': str(site)}
        subprocess.run(['bash', str(runner), web, selected], env=env, check=True, capture_output=True)
        saved = dict(l.split('=', 1) for l in (site / '.env').read_text().splitlines())
        for service in plan.SERVICES:
            assert saved[service.upper() + '_IMAGE_TAG'] == (web if service in selected.split(',') else base)
        commands = log.read_text()
        assert 'pull ' + selected.replace(',', ' ') + '\n' in commands
        assert 'up -d --no-deps --force-recreate --wait --wait-timeout 180 ' + selected.replace(',', ' ') + '\n' in commands
        assert ('/bootstrap' in commands) == ('api' in selected.split(','))
        assert (site / 'Caddyfile').read_text() == ('new proxy' if 'proxy' in selected else 'old proxy')
        before = (site / '.env').read_text()
        failed = subprocess.run(['bash', str(runner), shared, 'web;bad'], env=env, capture_output=True)
        assert failed.returncode != 0
        failed = subprocess.run(['bash', str(runner), web, selected], env=env | {'FAIL_UP': '1'}, capture_output=True)
        assert failed.returncode != 0 and (site / '.env').read_text() == before
print('PASS: 服务选择、累计变更、首次/全量、部分部署、旧版本兼容、失败时保留版本记录')
