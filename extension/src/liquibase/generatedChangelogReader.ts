import { existsSync, readFileSync, statSync } from 'node:fs';

export function readGeneratedChangelog(changeLogFile: string, stdout: string): string | undefined {
  if (existsSync(changeLogFile) && statSync(changeLogFile).size > 0) {
    return readFileSync(changeLogFile, 'utf8');
  }

  const trimmedStdout = stdout.trim();
  if (looksLikeChangelog(trimmedStdout)) {
    return `${trimmedStdout}\n`;
  }

  return undefined;
}

function looksLikeChangelog(value: string): boolean {
  return (
    value.startsWith('databaseChangeLog:') ||
    value.includes('\ndatabaseChangeLog:') ||
    value.startsWith('<databaseChangeLog') ||
    value.includes('\n<databaseChangeLog') ||
    value.includes('--liquibase formatted sql')
  );
}
