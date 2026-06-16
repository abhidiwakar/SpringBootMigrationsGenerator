import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface SpringBootApplicationPackageCandidate {
  packageName: string;
  filePath: string;
}

export function detectSpringBootApplicationPackages(workspaceRoot: string): SpringBootApplicationPackageCandidate[] {
  const sourceRoots = [
    join(workspaceRoot, 'src/main/java'),
    join(workspaceRoot, 'src/main/kotlin')
  ];
  const candidates = new Map<string, SpringBootApplicationPackageCandidate>();

  for (const sourceRoot of sourceRoots) {
    for (const filePath of listSourceFiles(sourceRoot)) {
      const content = readFileSync(filePath, 'utf8');
      if (!/(?:^|\s)@(?:[\w.]+\.)?SpringBootApplication\b/.test(content)) {
        continue;
      }

      const packageName = parsePackageName(content);
      if (packageName && !candidates.has(packageName)) {
        candidates.set(packageName, { packageName, filePath });
      }
    }
  }

  return [...candidates.values()].sort((first, second) => first.packageName.localeCompare(second.packageName));
}

function listSourceFiles(root: string): string[] {
  if (!existsSync(root)) {
    return [];
  }

  const entries: string[] = [];
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      entries.push(...listSourceFiles(path));
    } else if (stat.isFile() && /\.(java|kt)$/.test(name)) {
      entries.push(path);
    }
  }
  return entries;
}

function parsePackageName(content: string): string | undefined {
  return content.match(/^\s*package\s+([A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)*)\s*;?/m)?.[1];
}
