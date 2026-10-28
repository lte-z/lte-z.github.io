import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Loader } from 'astro/loaders';
import { strictFile } from '../src/lib/strict-file-loader.ts';

async function load(contents: string) {
  const directory = await mkdtemp(join(tmpdir(), 'lte-z-content-test-'));
  try {
    await writeFile(join(directory, 'projects.yaml'), contents);
    const entries = new Map();
    const context = {
      config: { root: pathToFileURL(directory + sep), prerenderConflictBehavior: 'error' },
      collection: 'projects',
      logger: { debug() {}, info() {}, warn() {}, error() {} },
      store: { clear() { entries.clear(); }, set(entry: { id: string }) { entries.set(entry.id, entry); } },
      parseData: async ({ data }: { data: unknown }) => data
    } as unknown as Parameters<Loader['load']>[0];
    await strictFile('projects.yaml').load(context);
    return entries;
  } finally {
    if (!resolve(directory).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unexpected temporary path');
    await rm(directory, { recursive: true, force: true });
  }
}

test('empty and valid project files load normally', async () => {
  assert.equal((await load('[]')).size, 0);
  assert.deepEqual([...(await load('- id: first\n- id: second')).keys()], ['first', 'second']);
});

test('duplicate project IDs reject instead of replacing an entry', async () => {
  await assert.rejects(load('- id: repeated\n- id: repeated'), /same slug/);
});

test('missing IDs reject instead of dropping an entry', async () => {
  await assert.rejects(load('- title: Missing ID\n- id: valid'), /missing an id/);
});

test('malformed YAML and invalid top-level values reject', async () => {
  await assert.rejects(load('- id: ['), /Error reading data/);
  await assert.rejects(load('5'), /Invalid data/);
});