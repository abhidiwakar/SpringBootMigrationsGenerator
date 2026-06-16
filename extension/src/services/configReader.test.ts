import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readSpringConfig, resolveSpringPlaceholders } from './configReader';

function withTempProject(run: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'slcg-config-'));
  try {
    mkdirSync(join(root, 'src/main/resources'), { recursive: true });
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('readSpringConfig', () => {
  it('parses application.properties and tracks unresolved placeholders', () => {
    withTempProject((root) => {
      writeFileSync(
        join(root, 'src/main/resources/application.properties'),
        [
          'spring.datasource.url=${DB_URL}',
          'spring.datasource.username=app',
          'spring.jpa.hibernate.ddl-auto=update'
        ].join('\n')
      );

      const config = readSpringConfig(root);

      assert.equal(config.values['spring.datasource.url'], '${DB_URL}');
      assert.equal(config.values['spring.datasource.username'], 'app');
      assert.equal(config.values['spring.jpa.hibernate.ddl-auto'], 'update');
      assert.deepEqual(config.unresolvedPlaceholders, ['DB_URL']);
    });
  });

  it('parses nested YAML into Spring dotted keys', () => {
    withTempProject((root) => {
      writeFileSync(
        join(root, 'src/main/resources/application.yml'),
        [
          'spring:',
          '  datasource:',
          '    url: jdbc:postgresql://localhost:5432/app',
          '    password: ${DB_PASSWORD}',
          '  liquibase:',
          '    change-log: classpath:db/changelog/db.changelog-master.yaml'
        ].join('\n')
      );

      const config = readSpringConfig(root);

      assert.equal(config.values['spring.datasource.url'], 'jdbc:postgresql://localhost:5432/app');
      assert.equal(config.values['spring.datasource.password'], '${DB_PASSWORD}');
      assert.equal(config.values['spring.liquibase.change-log'], 'classpath:db/changelog/db.changelog-master.yaml');
      assert.deepEqual(config.unresolvedPlaceholders, ['DB_PASSWORD']);
    });
  });
});

describe('resolveSpringPlaceholders', () => {
  it('uses environment values before Spring placeholder defaults', () => {
    const resolved = resolveSpringPlaceholders('${DB_URL:jdbc:postgresql://localhost:5678/shortener}', {
      DB_URL: 'jdbc:postgresql://db:5432/prod'
    });

    assert.equal(resolved, 'jdbc:postgresql://db:5432/prod');
  });

  it('uses Spring placeholder defaults when environment values are missing', () => {
    const resolved = resolveSpringPlaceholders('${DB_USER:shortener}', {});

    assert.equal(resolved, 'shortener');
  });
});
