import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { sanitizeDescription as sanitize } from '../utils/sanitizers';

export interface SaveGeneratedChangelogOptions {
  workspaceRoot: string;
  changelogRoot: string;
  filename: string;
  content: string;
}

export interface SavedGeneratedChangelog {
  absolutePath: string;
  relativePath: string;
}

export function sanitizeDescription(value: string): string {
  return sanitize(value);
}

export function generateChangesetId(number: number, description: string): string {
  return `${number.toString().padStart(3, '0')}-${sanitizeDescription(description)}`;
}

export function generateNextFilename(existingFilenames: string[], description: string): string {
  const max = existingFilenames.reduce((current, filename) => {
    const match = filename.match(/^(\d+)-/);
    return match ? Math.max(current, Number.parseInt(match[1], 10)) : current;
  }, 0);
  return `${generateChangesetId(max + 1, description)}.yaml`;
}

export function saveGeneratedChangelog(options: SaveGeneratedChangelogOptions): SavedGeneratedChangelog {
  const absoluteRoot = join(options.workspaceRoot, options.changelogRoot);
  const absolutePath = join(absoluteRoot, options.filename);
  if (existsSync(absolutePath)) {
    throw new Error(`Changelog file already exists: ${absolutePath}`);
  }

  mkdirSync(absoluteRoot, { recursive: true });
  writeFileSync(absolutePath, options.content, { encoding: 'utf8', flag: 'wx' });
  return {
    absolutePath,
    relativePath: relative(options.workspaceRoot, absolutePath)
  };
}

export function listExistingChangelogFilenames(workspaceRoot: string, changelogRoot: string): string[] {
  const absoluteRoot = join(workspaceRoot, changelogRoot);
  if (!existsSync(absoluteRoot)) {
    return [];
  }

  return readdirSync(absoluteRoot)
    .filter((name) => statSync(join(absoluteRoot, name)).isFile())
    .sort((first, second) => first.localeCompare(second));
}

export function addYamlInclude(masterContent: string, includeFile: string): string {
  if (masterContent.includes(`file: ${includeFile}`) || masterContent.includes(`file: "${includeFile}"`)) {
    return ensureTrailingNewline(masterContent);
  }

  const trimmed = masterContent.trim();
  if (trimmed.length === 0) {
    return ['databaseChangeLog:', '  - include:', `      file: ${includeFile}`, ''].join('\n');
  }

  if (!/^databaseChangeLog:\s*$/m.test(masterContent)) {
    throw new Error('Master changelog must contain a databaseChangeLog root key.');
  }

  return `${trimmed}\n  - include:\n      file: ${includeFile}\n`;
}

export function createEmptyMasterChangelog(): string {
  return 'databaseChangeLog:\n';
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith('\n') ? value : `${value}\n`;
}
