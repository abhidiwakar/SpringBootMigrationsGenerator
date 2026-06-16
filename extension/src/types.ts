export type BuildTool = 'maven' | 'gradle' | 'unknown';

export type ChangelogFormat = 'yaml' | 'xml' | 'json' | 'sql';

export interface DependencyFinding {
  found: boolean;
  evidence: string[];
}

export interface ProjectDetection {
  workspaceRoot: string;
  buildTool: BuildTool;
  isSpringBoot: boolean;
  hibernateMajor?: number;
  liquibase: DependencyFinding;
  jpa: DependencyFinding;
  postgresql: DependencyFinding;
  liquibaseHibernate: DependencyFinding;
  configFiles: string[];
  changelogRoot?: string;
  masterChangelog?: string;
}

export interface SpringConfig {
  sourceFiles: string[];
  values: Record<string, string | boolean | number | null>;
  unresolvedPlaceholders: string[];
}

export interface ValidationIssue {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  remediation?: string;
}

export interface ValidationReport {
  detection: ProjectDetection;
  config: SpringConfig;
  issues: ValidationIssue[];
}

export interface LiquibaseCommand {
  executable: string;
  args: string[];
  displayCommand: string;
  secrets: string[];
}
