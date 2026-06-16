import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { readGeneratedChangelog } from './generatedChangelogReader';

describe('readGeneratedChangelog', () => {
  it('reads generated content from the changelog file when present', () => {
    const root = mkdtempSync(join(tmpdir(), 'slcg-generated-'));
    try {
      const file = join(root, '001.yaml');
      writeFileSync(file, 'databaseChangeLog:\n  - changeSet: []\n', 'utf8');

      assert.equal(readGeneratedChangelog(file, ''), 'databaseChangeLog:\n  - changeSet: []\n');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('uses stdout when Liquibase exits successfully but does not create the file', () => {
    const root = mkdtempSync(join(tmpdir(), 'slcg-generated-'));
    try {
      const file = join(root, 'missing.yaml');
      const stdout = 'databaseChangeLog:\n  - changeSet: []\n';

      assert.equal(readGeneratedChangelog(file, stdout), stdout);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('returns undefined when neither file nor stdout contain changelog content', () => {
    const root = mkdtempSync(join(tmpdir(), 'slcg-generated-'));
    try {
      assert.equal(readGeneratedChangelog(join(root, 'missing.yaml'), 'Liquibase command completed'), undefined);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
