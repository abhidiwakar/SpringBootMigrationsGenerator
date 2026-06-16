import { createWriteStream, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { get } from 'node:https';
import { basename, dirname, join } from 'node:path';

const LIQUIBASE_CORE_5 = {
  fileName: 'liquibase-core-5.0.3.jar',
  url: 'https://repo1.maven.org/maven2/org/liquibase/liquibase-core/5.0.3/liquibase-core-5.0.3.jar'
};

const LIQUIBASE_HIBERNATE_7 = {
  fileName: 'liquibase-hibernate7-5.0.3.jar',
  url: 'https://github.com/liquibase/liquibase-hibernate/releases/download/v5.0.3/liquibase-hibernate7-5.0.3.jar'
};

export interface Hibernate7LiquibaseToolingOptions {
  toolsDirectory: string;
  liquibaseCoreJarPath?: string;
  liquibaseHibernateJarPath?: string;
  allowDownloads: boolean;
  logger?: {
    info(message: string): void;
  };
}

export interface Hibernate7LiquibaseClasspathOptions {
  baseClasspath: string[];
  liquibaseCoreJar: string;
  liquibaseHibernateJar: string;
}

export async function resolveHibernateAwareLiquibaseClasspath(
  baseClasspath: string[],
  options?: Hibernate7LiquibaseToolingOptions
): Promise<string[]> {
  if (detectHibernateMajorFromClasspath(baseClasspath) !== 7) {
    return baseClasspath;
  }

  const legacyLiquibaseHibernateJars = baseClasspath.filter((entry) => isLiquibaseHibernateLegacyJar(entry)).map((entry) => basename(entry));
  if (legacyLiquibaseHibernateJars.length > 0) {
    options?.logger?.info(`Replacing incompatible Liquibase Hibernate jars: ${legacyLiquibaseHibernateJars.join(', ')}`);
  }

  if (hasLiquibaseHibernate7(baseClasspath) && hasLiquibaseCore5(baseClasspath)) {
    return baseClasspath.filter((entry) => !isLiquibaseHibernateLegacyJar(entry));
  }

  if (!options) {
    throw new Error(
      'Hibernate 7 was detected, but Hibernate 7 Liquibase tooling was not configured. Configure Liquibase Hibernate 7 jar paths or enable automatic tool downloads.'
    );
  }

  options.logger?.info('Detected Hibernate 7 runtime classpath; preparing Liquibase 5.0.3 with liquibase-hibernate7 5.0.3.');
  const liquibaseCoreJar =
    normalizePath(options.liquibaseCoreJarPath) ??
    (await ensureToolJar(options.toolsDirectory, LIQUIBASE_CORE_5, options.allowDownloads, options.logger));
  const liquibaseHibernateJar =
    normalizePath(options.liquibaseHibernateJarPath) ??
    (await ensureToolJar(options.toolsDirectory, LIQUIBASE_HIBERNATE_7, options.allowDownloads, options.logger));

  return composeHibernate7LiquibaseClasspath({
    baseClasspath,
    liquibaseCoreJar,
    liquibaseHibernateJar
  });
}

export function composeHibernate7LiquibaseClasspath(options: Hibernate7LiquibaseClasspathOptions): string[] {
  const sanitizedBaseClasspath = options.baseClasspath.filter(
    (entry) => !isLiquibaseCoreJar(entry) && !isLiquibaseHibernateJar(entry)
  );
  return [options.liquibaseCoreJar, options.liquibaseHibernateJar, ...sanitizedBaseClasspath];
}

export function detectHibernateMajorFromClasspath(classpath: string[]): number | undefined {
  for (const entry of classpath) {
    const match = /(?:^|[/\\])hibernate-core-(\d+)\.[^/\\]*\.jar$/i.exec(entry);
    if (match) {
      return Number.parseInt(match[1], 10);
    }
  }
  return undefined;
}

export function hasLiquibaseHibernate7(classpath: string[]): boolean {
  return classpath.some((entry) => /(?:^|[/\\])liquibase-hibernate7-[^/\\]+\.jar$/i.test(entry));
}

function hasLiquibaseCore5(classpath: string[]): boolean {
  return classpath.some((entry) => /(?:^|[/\\])liquibase-core-5\.[^/\\]+\.jar$/i.test(entry));
}

function isLiquibaseCoreJar(entry: string): boolean {
  return /(?:^|[/\\])liquibase-core-[^/\\]+\.jar$/i.test(entry);
}

function isLiquibaseHibernateJar(entry: string): boolean {
  return /(?:^|[/\\])liquibase-hibernate[4567]?-[^/\\]+\.jar$/i.test(entry);
}

function isLiquibaseHibernateLegacyJar(entry: string): boolean {
  return /(?:^|[/\\])liquibase-hibernate[456]-[^/\\]+\.jar$/i.test(entry);
}

async function ensureToolJar(
  toolsDirectory: string,
  artifact: { fileName: string; url: string },
  allowDownloads: boolean,
  logger?: { info(message: string): void }
): Promise<string> {
  const target = join(toolsDirectory, artifact.fileName);
  if (existsSync(target)) {
    return target;
  }
  if (!allowDownloads) {
    throw new Error(
      `Missing ${artifact.fileName}. Configure its absolute path in VS Code settings or enable automatic Hibernate 7 Liquibase tooling downloads.`
    );
  }

  mkdirSync(dirname(target), { recursive: true });
  logger?.info(`Downloading ${artifact.fileName} from ${artifact.url}`);
  await downloadFile(artifact.url, target);
  return target;
}

function normalizePath(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function downloadFile(url: string, target: string, redirectsRemaining = 5): Promise<void> {
  const temporaryTarget = `${target}.download`;
  return new Promise((resolve, reject) => {
    const request = get(url, (response) => {
      const statusCode = response.statusCode ?? 0;
      const location = response.headers.location;
      if (statusCode >= 300 && statusCode < 400 && location) {
        response.resume();
        if (redirectsRemaining <= 0) {
          reject(new Error(`Too many redirects while downloading ${url}.`));
          return;
        }
        downloadFile(new URL(location, url).toString(), target, redirectsRemaining - 1).then(resolve, reject);
        return;
      }
      if (statusCode !== 200) {
        response.resume();
        reject(new Error(`Download failed for ${url}: HTTP ${statusCode}.`));
        return;
      }

      const file = createWriteStream(temporaryTarget);
      file.on('error', reject);
      file.on('finish', () => {
        file.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          renameSync(temporaryTarget, target);
          resolve();
        });
      });
      response.pipe(file);
    });

    request.on('error', (error) => {
      rmSync(temporaryTarget, { force: true });
      reject(error);
    });
  });
}
