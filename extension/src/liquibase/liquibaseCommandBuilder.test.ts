import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildDiffChangelogCommand, buildInitialChangelogCommand } from './liquibaseCommandBuilder';

describe('liquibaseCommandBuilder', () => {
  it('builds an initial changelog command with redacted password display', () => {
    const command = buildInitialChangelogCommand({
      liquibaseCommand: 'liquibase',
      changeLogFile: 'src/main/resources/db/changelog/changes/001-initial-schema.yaml',
      url: 'jdbc:postgresql://localhost:5432/app',
      username: 'app',
      password: 's3cr3t'
    });

    assert.ok(command.args.includes('--changeLogFile=src/main/resources/db/changelog/changes/001-initial-schema.yaml'));
    assert.equal(command.args.some((arg) => arg.startsWith('--changelog-file=')), false);
    assert.ok(command.args.includes('generateChangelog'));
    assert.ok(command.args.includes('--password=s3cr3t'));
    assert.match(command.displayCommand, /--password=\*\*\*/);
    assert.equal(command.displayCommand.includes('s3cr3t'), false);
  });

  it('builds an entity diff command using a Hibernate reference URL', () => {
    const command = buildDiffChangelogCommand({
      liquibaseCommand: 'liquibase',
      changeLogFile: 'src/main/resources/db/changelog/changes/002-users.yaml',
      url: 'jdbc:postgresql://localhost:5432/app',
      username: 'app',
      password: 's3cr3t',
      referenceUrl: 'hibernate:spring:com.example?dialect=org.hibernate.dialect.PostgreSQLDialect'
    });

    assert.ok(command.args.includes('diffChangelog'));
    assert.ok(command.args.includes('--referenceUrl=hibernate:spring:com.example?dialect=org.hibernate.dialect.PostgreSQLDialect'));
    assert.equal(command.args.some((arg) => arg.startsWith('--reference-url=')), false);
    assert.equal(command.displayCommand.includes('s3cr3t'), false);
  });
});
