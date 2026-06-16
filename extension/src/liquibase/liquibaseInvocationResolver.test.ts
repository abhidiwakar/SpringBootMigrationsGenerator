import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { buildJavaLiquibaseCommand, getBuildToolCommand } from './liquibaseInvocationResolver';

function withTempProject(run: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'slcg-invocation-'));
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('liquibaseInvocationResolver', () => {
  it('prefers a project Gradle wrapper when present', () => {
    withTempProject((root) => {
      const wrapper = join(root, 'gradlew');
      writeFileSync(wrapper, '#!/bin/sh\n');

      const command = getBuildToolCommand(root, 'gradle');

      assert.equal(command, wrapper);
    });
  });

  it('falls back to gradle when no wrapper exists', () => {
    withTempProject((root) => {
      const command = getBuildToolCommand(root, 'gradle');

      assert.equal(command, 'gradle');
    });
  });

  it('builds a Java Liquibase command from a project classpath', () => {
    const command = buildJavaLiquibaseCommand({
      javaCommand: 'java',
      classpath: ['/app/build/classes/java/main', '/home/.gradle/liquibase-core.jar'],
      liquibaseArgs: ['--changeLogFile=/tmp/001.yaml', '--password=s3cr3t', 'generateChangelog'],
      secrets: ['s3cr3t']
    });

    assert.equal(command.executable, 'java');
    assert.deepEqual(command.args.slice(0, 3), ['-cp', ['/app/build/classes/java/main', '/home/.gradle/liquibase-core.jar'].join(':'),
      'liquibase.integration.commandline.Main'
    ]);
    assert.ok(command.args.includes('generateChangelog'));
    assert.equal(command.displayCommand.includes('s3cr3t'), false);
    assert.match(command.displayCommand, /--password=\*\*\*/);
  });
});
