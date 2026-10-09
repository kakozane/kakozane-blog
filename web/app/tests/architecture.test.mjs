import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : /\.tsx?$/.test(path) ? [path] : [];
  });
}

test('shared code stays independent and browser modules cannot import server implementations', () => {
  for (const path of files(app)) {
    const name = relative(app, path).replaceAll('\\', '/');
    const source = readFileSync(path, 'utf8');
    for (const match of source.matchAll(/import\s+(type\s+)?[^;]*?from\s+["']([^"']+)["']/g)) {
      const [, typeOnly, specifier] = match;
      if (!specifier.startsWith('.')) continue;
      const target = relative(app, resolve(dirname(path), specifier)).replaceAll('\\', '/');
      if (name.startsWith('shared/')) {
        assert.ok(!/^(modules|routes|layouts)\//.test(target), `${name} depends on ${target}`);
      }
      if (name.startsWith('modules/')) {
        assert.ok(!target.startsWith('routes/'), `${name} depends on a route`);
        if (!name.endsWith('.server.ts') && !typeOnly) {
          assert.ok(!/\.server(?:\.ts)?$/.test(target), `${name} imports server code at runtime`);
        }
      }
    }
    if (/^modules\/[^/]+\/(pages|components|hooks)\//.test(name) || name.startsWith('layouts/')) {
      assert.ok(!/\bfetch\s*\(/.test(source), `${name} contains an API request`);
    }
  }
});
