import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SpringConfig } from '../types';
import { flattenObject, parseYaml } from '../utils/yamlUtils';

const CONFIG_RELATIVE_PATHS = [
  'src/main/resources/application.properties',
  'src/main/resources/application.yml',
  'src/main/resources/application.yaml'
];

export function readSpringConfig(workspaceRoot: string): SpringConfig {
  const sourceFiles: string[] = [];
  const values: Record<string, string | boolean | number | null> = {};

  for (const relativePath of CONFIG_RELATIVE_PATHS) {
    const path = join(workspaceRoot, relativePath);
    if (!existsSync(path)) {
      continue;
    }

    sourceFiles.push(path);
    const content = readFileSync(path, 'utf8');
    const parsed = relativePath.endsWith('.properties') ? parseProperties(content) : flattenObject(parseYaml(content));
    Object.assign(values, parsed);
  }

  return {
    sourceFiles,
    values,
    unresolvedPlaceholders: findPlaceholders(values)
  };
}

export function parseProperties(content: string): Record<string, string> {
  return content.split(/\r?\n/).reduce<Record<string, string>>((result, line) => {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      return result;
    }

    const separatorIndex = findPropertySeparator(trimmed);
    if (separatorIndex === -1) {
      result[trimmed] = '';
      return result;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    result[key] = value;
    return result;
  }, {});
}

export function resolveSpringPlaceholders(value: string, env: Record<string, string | undefined> = process.env): string {
  return value.replace(/\$\{([^}:]+)(?::([^}]*))?}/g, (match, name: string, defaultValue: string | undefined) => {
    const envValue = env[name];
    if (envValue !== undefined && envValue.length > 0) {
      return envValue;
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    return match;
  });
}

function findPropertySeparator(value: string): number {
  const equals = value.indexOf('=');
  const colon = value.indexOf(':');
  if (equals === -1) {
    return colon;
  }
  if (colon === -1) {
    return equals;
  }
  return Math.min(equals, colon);
}

function findPlaceholders(values: Record<string, string | boolean | number | null>): string[] {
  const found = new Set<string>();
  for (const value of Object.values(values)) {
    if (typeof value !== 'string') {
      continue;
    }
    for (const match of value.matchAll(/\$\{([^}:]+)(?::[^}]*)?}/g)) {
      found.add(match[1]);
    }
  }
  return [...found].sort();
}
