import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  addYamlInclude,
  generateChangesetId,
  generateNextFilename,
  listExistingChangelogFilenames,
  saveGeneratedChangelog,
  sanitizeDescription
} from './changelogService';

function withTempProject(run: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'slcg-save-'));
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('changelogService', () => {
  it('sanitizes descriptions for changelog filenames', () => {
    assert.equal(sanitizeDescription(' Add short_code to Shortened URLs!! '), 'add-short-code-to-shortened-urls');
  });

  it('generates numbered YAML filenames', () => {
    assert.equal(
      generateNextFilename(['001-initial-schema.yaml', '002-users.yaml'], 'Add Email to Users'),
      '003-add-email-to-users.yaml'
    );
  });

  it('generates stable changeset ids', () => {
    assert.equal(generateChangesetId(2, 'Add Email to Users'), '002-add-email-to-users');
  });

  it('adds a YAML include without duplicating existing includes', () => {
    const original = ['databaseChangeLog:', '  - include:', '      file: db/changelog/changes/001-initial.yaml'].join('\n');
    const once = addYamlInclude(original, 'db/changelog/changes/002-users.yaml');
    const twice = addYamlInclude(once, 'db/changelog/changes/002-users.yaml');

    assert.match(once, /file: db\/changelog\/changes\/002-users\.yaml/);
    assert.equal(twice.match(/002-users\.yaml/g)?.length, 1);
  });

  it('saves generated changelogs into the configured changelog root', () => {
    withTempProject((root) => {
      const saved = saveGeneratedChangelog({
        workspaceRoot: root,
        changelogRoot: 'src/main/resources/db/changelog',
        filename: '001-entity-diff.yaml',
        content: 'databaseChangeLog:\n'
      });

      assert.equal(saved.relativePath, 'src/main/resources/db/changelog/001-entity-diff.yaml');
      assert.equal(readFileSync(saved.absolutePath, 'utf8'), 'databaseChangeLog:\n');
    });
  });

  it('does not overwrite an existing generated changelog file', () => {
    withTempProject((root) => {
      const existingPath = join(root, 'src/main/resources/db/changelog/001-entity-diff.yaml');
      mkdirSync(join(existingPath, '..'), { recursive: true });
      writeFileSync(existingPath, 'existing', { flag: 'wx' });

      assert.throws(
        () =>
          saveGeneratedChangelog({
            workspaceRoot: root,
            changelogRoot: 'src/main/resources/db/changelog',
            filename: '001-entity-diff.yaml',
            content: 'databaseChangeLog:\n'
          }),
        /already exists/
      );
      assert.equal(existsSync(existingPath), true);
      assert.equal(readFileSync(existingPath, 'utf8'), 'existing');
    });
  });

  it('lists existing changelog filenames from the configured changelog root', () => {
    withTempProject((root) => {
      const changelogRoot = join(root, 'src/main/resources/db/changelog');
      mkdirSync(changelogRoot, { recursive: true });
      writeFileSync(join(changelogRoot, '002-users.yaml'), 'databaseChangeLog:\n');
      writeFileSync(join(changelogRoot, '001-initial.yaml'), 'databaseChangeLog:\n');
      mkdirSync(join(changelogRoot, 'archive'));

      assert.deepEqual(listExistingChangelogFilenames(root, 'src/main/resources/db/changelog'), [
        '001-initial.yaml',
        '002-users.yaml'
      ]);
    });
  });
});
