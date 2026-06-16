import type { SpringConfig, ValidationIssue } from '../types';

export function validateDatabaseConfig(config: SpringConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const url = config.values['spring.datasource.url'];

  if (typeof url !== 'string' || url.trim().length === 0) {
    issues.push({
      severity: 'error',
      code: 'datasourceUrlMissing',
      message: 'spring.datasource.url was not found.',
      remediation: 'Add spring.datasource.url to application.properties, application.yml, or application.yaml.'
    });
    return issues;
  }

  if (!url.includes('postgresql') && !url.includes('${')) {
    issues.push({
      severity: 'error',
      code: 'unsupportedDatabase',
      message: 'Only PostgreSQL datasource URLs are supported in the MVP.',
      remediation: 'Use a jdbc:postgresql:// datasource for this MVP.'
    });
  }

  return issues;
}
