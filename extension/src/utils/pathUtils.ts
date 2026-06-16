import { existsSync } from 'node:fs';
import { join, normalize, sep } from 'node:path';

export function firstExisting(root: string, relativePaths: string[]): string | undefined {
  return relativePaths.map((relativePath) => join(root, relativePath)).find((candidate) => existsSync(candidate));
}

export function toPosixPath(path: string): string {
  return normalize(path).split(sep).join('/');
}

export function stripClasspathPrefix(value: string): string {
  return value.replace(/^classpath:/, '').replace(/^\/+/, '');
}
