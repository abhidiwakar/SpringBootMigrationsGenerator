import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildHibernateReference } from './hibernateReferenceBuilder';
import type { ProjectDetection } from '../types';

function detection(overrides: Partial<ProjectDetection> = {}): ProjectDetection {
  return {
    workspaceRoot: '/workspace',
    buildTool: 'gradle',
    isSpringBoot: true,
    liquibase: { found: true, evidence: [] },
    jpa: { found: true, evidence: [] },
    postgresql: { found: true, evidence: [] },
    liquibaseHibernate: { found: false, evidence: [] },
    configFiles: [],
    ...overrides
  };
}

describe('buildHibernateReference', () => {
  it('allows Hibernate 7 projects to rely on extension-managed Liquibase Hibernate tooling', () => {
    const result = buildHibernateReference(
      detection({ hibernateMajor: 7 }),
      { sourceFiles: [], values: {}, unresolvedPlaceholders: [] },
      'com.example.demo'
    );

    assert.equal(result.issues.length, 0);
    assert.equal(result.referenceUrl, 'hibernate:spring:com.example.demo?dialect=org.hibernate.dialect.PostgreSQLDialect');
  });

  it('still requires a Liquibase Hibernate integration for older or unknown Hibernate projects', () => {
    const result = buildHibernateReference(
      detection(),
      { sourceFiles: [], values: {}, unresolvedPlaceholders: [] },
      'com.example.demo'
    );

    assert.equal(result.referenceUrl, undefined);
    assert.equal(result.issues[0]?.code, 'liquibaseHibernateMissing');
  });
});
