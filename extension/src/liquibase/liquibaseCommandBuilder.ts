import type { LiquibaseCommand } from '../types';
import { redactSecrets } from '../services/safetyService';

export interface BaseLiquibaseOptions {
  liquibaseCommand: string;
  changeLogFile: string;
  url: string;
  username?: string;
  password?: string;
  defaultSchemaName?: string;
}

export interface DiffLiquibaseOptions extends BaseLiquibaseOptions {
  referenceUrl: string;
}

export function buildInitialChangelogCommand(options: BaseLiquibaseOptions): LiquibaseCommand {
  return buildCommand(options, ['generateChangelog']);
}

export function buildDiffChangelogCommand(options: DiffLiquibaseOptions): LiquibaseCommand {
  return buildCommand(options, [`--referenceUrl=${options.referenceUrl}`, 'diffChangelog']);
}

function buildCommand(options: BaseLiquibaseOptions, trailingArgs: string[]): LiquibaseCommand {
  const secrets = options.password ? [options.password] : [];
  const args = [
    `--changeLogFile=${options.changeLogFile}`,
    `--url=${options.url}`,
    ...(options.username ? [`--username=${options.username}`] : []),
    ...(options.password ? [`--password=${options.password}`] : []),
    ...(options.defaultSchemaName ? [`--defaultSchemaName=${options.defaultSchemaName}`] : []),
    ...trailingArgs
  ];
  const rawDisplay = [options.liquibaseCommand, ...args].join(' ');

  return {
    executable: options.liquibaseCommand,
    args,
    secrets,
    displayCommand: redactSecrets(rawDisplay.replace(/--password=([^\s]+)/g, '--password=***'), secrets)
  };
}

export function buildInitialChangelogArgs(options: Omit<BaseLiquibaseOptions, 'liquibaseCommand'>): { args: string[]; secrets: string[] } {
  return buildLiquibaseArgs(options, ['generateChangelog']);
}

export function buildDiffChangelogArgs(options: Omit<DiffLiquibaseOptions, 'liquibaseCommand'>): { args: string[]; secrets: string[] } {
  return buildLiquibaseArgs(options, [`--referenceUrl=${options.referenceUrl}`, 'diffChangelog']);
}

function buildLiquibaseArgs(
  options: Omit<BaseLiquibaseOptions, 'liquibaseCommand'>,
  trailingArgs: string[]
): { args: string[]; secrets: string[] } {
  return {
    secrets: options.password ? [options.password] : [],
    args: [
      `--changeLogFile=${options.changeLogFile}`,
      `--url=${options.url}`,
      ...(options.username ? [`--username=${options.username}`] : []),
      ...(options.password ? [`--password=${options.password}`] : []),
      ...(options.defaultSchemaName ? [`--defaultSchemaName=${options.defaultSchemaName}`] : []),
      ...trailingArgs
    ]
  };
}
