import * as vscode from 'vscode';
import { readSpringConfig } from '../services/configReader';
import { validateDatabaseConfig } from '../services/databaseService';
import { detectProject } from '../services/projectDetector';
import type { ValidationIssue, ValidationReport } from '../types';
import { Logger } from '../utils/logger';

export async function validateSetup(workspaceRoot: string, logger: Logger): Promise<ValidationReport> {
  const detection = detectProject(workspaceRoot);
  const config = readSpringConfig(workspaceRoot);
  const issues: ValidationIssue[] = [];

  if (detection.buildTool === 'unknown') {
    issues.push({
      severity: 'error',
      code: 'buildToolMissing',
      message: 'No Maven or Gradle build file was found.',
      remediation: 'Open a Spring Boot project containing pom.xml, build.gradle, or build.gradle.kts.'
    });
  }
  if (!detection.isSpringBoot) {
    issues.push({
      severity: 'error',
      code: 'springBootMissing',
      message: 'Spring Boot dependency was not detected.',
      remediation: 'Add Spring Boot dependencies or open the Spring Boot project root.'
    });
  }
  if (!detection.liquibase.found) {
    issues.push({
      severity: 'error',
      code: 'liquibaseMissing',
      message: 'Liquibase dependency was not detected.',
      remediation: 'Add spring-boot-starter-liquibase or org.liquibase:liquibase-core.'
    });
  }
  if (!detection.jpa.found) {
    issues.push({
      severity: 'error',
      code: 'jpaMissing',
      message: 'JPA/Hibernate dependency was not detected.',
      remediation: 'Add spring-boot-starter-data-jpa or hibernate-core.'
    });
  }
  if (!detection.postgresql.found) {
    issues.push({
      severity: 'error',
      code: 'postgresqlMissing',
      message: 'PostgreSQL driver dependency was not detected.',
      remediation: 'Add org.postgresql:postgresql.'
    });
  }
  if (config.sourceFiles.length === 0) {
    issues.push({
      severity: 'error',
      code: 'springConfigMissing',
      message: 'No Spring application config file was found.',
      remediation: 'Add application.properties, application.yml, or application.yaml under src/main/resources.'
    });
  }
  if (config.values['spring.jpa.hibernate.ddl-auto'] === 'update') {
    issues.push({
      severity: 'warning',
      code: 'ddlAutoUpdate',
      message: 'ddl-auto=update is convenient locally but unsafe for production.',
      remediation: 'Use spring.jpa.hibernate.ddl-auto=validate or none in production with Liquibase enabled.'
    });
  }

  issues.push(...validateDatabaseConfig(config));

  const report = { detection, config, issues };
  logReport(report, logger);
  const errorCount = issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
  void vscode.window.showInformationMessage(`Spring Liquibase validation complete: ${errorCount} errors, ${warningCount} warnings.`);
  return report;
}

function logReport(report: ValidationReport, logger: Logger): void {
  logger.info(`Project root: ${report.detection.workspaceRoot}`);
  logger.info(`Build tool: ${report.detection.buildTool}`);
  logger.info(`Spring Boot detected: ${report.detection.isSpringBoot ? 'yes' : 'no'}`);
  logger.info(`Liquibase dependency: ${report.detection.liquibase.found ? 'found' : 'missing'}`);
  logger.info(`JPA/Hibernate dependency: ${report.detection.jpa.found ? 'found' : 'missing'}`);
  logger.info(`PostgreSQL dependency: ${report.detection.postgresql.found ? 'found' : 'missing'}`);
  logger.info(`Config files: ${report.config.sourceFiles.length}`);
  for (const issue of report.issues) {
    const line = `${issue.code}: ${issue.message}${issue.remediation ? ` ${issue.remediation}` : ''}`;
    if (issue.severity === 'error') {
      logger.error(line);
    } else if (issue.severity === 'warning') {
      logger.warn(line);
    } else {
      logger.info(line);
    }
  }
  logger.show();
}
