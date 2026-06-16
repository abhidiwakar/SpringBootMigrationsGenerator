import type { ProjectDetection, SpringConfig, ValidationIssue } from '../types';

export interface HibernateReferenceResult {
  referenceUrl?: string;
  issues: ValidationIssue[];
}

export function buildHibernateReference(
  detection: ProjectDetection,
  config: SpringConfig,
  basePackage?: string
): HibernateReferenceResult {
  const issues: ValidationIssue[] = [];

  if (!detection.liquibaseHibernate.found && detection.hibernateMajor !== 7) {
    issues.push({
      severity: 'error',
      code: 'liquibaseHibernateMissing',
      message: 'liquibase-hibernate is required for entity-based changelog generation.',
      remediation: 'Add org.liquibase.ext:liquibase-hibernate6 for Spring Boot 3/Hibernate 6 projects, then retry.'
    });
  }

  const packageName = basePackage?.trim();
  if (!packageName) {
    issues.push({
      severity: 'error',
      code: 'basePackageMissing',
      message: 'A base package is required to build the Hibernate reference URL.',
      remediation: 'Configure the application base package before generating entity diff changelogs.'
    });
  }

  if (issues.some((issue) => issue.severity === 'error')) {
    return { issues };
  }

  const dialect =
    typeof config.values['spring.jpa.database-platform'] === 'string'
      ? config.values['spring.jpa.database-platform']
      : 'org.hibernate.dialect.PostgreSQLDialect';
  return {
    referenceUrl: `hibernate:spring:${packageName}?dialect=${dialect}`,
    issues
  };
}
