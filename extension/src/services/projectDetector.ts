import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { DependencyFinding, ProjectDetection } from '../types';

export function detectProject(workspaceRoot: string): ProjectDetection {
  const pomPath = join(workspaceRoot, 'pom.xml');
  const gradlePath = join(workspaceRoot, 'build.gradle');
  const gradleKtsPath = join(workspaceRoot, 'build.gradle.kts');
  const buildTool = existsSync(pomPath) ? 'maven' : existsSync(gradlePath) || existsSync(gradleKtsPath) ? 'gradle' : 'unknown';
  const buildContent = readExisting([pomPath, gradlePath, gradleKtsPath]).join('\n');
  const configFiles = findConfigFiles(workspaceRoot);
  const changelogRoot = existsSync(join(workspaceRoot, 'src/main/resources/db/changelog'))
    ? join(workspaceRoot, 'src/main/resources/db/changelog')
    : undefined;
  const masterChangelog = [
    'src/main/resources/db/changelog/db.changelog-master.yaml',
    'src/main/resources/db/changelog/db.changelog-master.yml',
    'src/main/resources/db/changelog/db.changelog-master.xml',
    'src/main/resources/db/changelog/db.changelog-master.json'
  ]
    .map((relativePath) => join(workspaceRoot, relativePath))
    .find((path) => existsSync(path));

  return {
    workspaceRoot,
    buildTool,
    isSpringBoot: includesAny(buildContent, ['spring-boot', 'org.springframework.boot']),
    hibernateMajor: inferHibernateMajor(buildContent),
    liquibase: finding(buildContent, [
      'spring-boot-starter-liquibase',
      'liquibase-core',
      'liquibase-maven-plugin',
      'liquibase-gradle-plugin',
      'org.liquibase:liquibase-core'
    ]),
    jpa: finding(buildContent, ['spring-boot-starter-data-jpa', 'hibernate-core', 'org.hibernate.orm:hibernate-core']),
    postgresql: finding(buildContent, ['org.postgresql', 'postgresql']),
    liquibaseHibernate: finding(buildContent, [
      'liquibase-hibernate',
      'liquibase-hibernate5',
      'liquibase-hibernate6',
      'liquibase-hibernate7'
    ]),
    configFiles,
    changelogRoot,
    masterChangelog
  };
}

function inferHibernateMajor(content: string): number | undefined {
  if (
    /org\.springframework\.boot['":\s)]*(?:version\s*)?['"]?4\./.test(content) ||
    /spring-boot(?:.|\n){0,400}(?:<version>|version\s*['"]?)4\./.test(content) ||
    /<spring-boot\.version>4\./.test(content)
  ) {
    return 7;
  }

  const explicitHibernate = /hibernate-core[^0-9]+([0-9]+)\./.exec(content);
  if (explicitHibernate) {
    return Number.parseInt(explicitHibernate[1], 10);
  }

  return undefined;
}

function readExisting(paths: string[]): string[] {
  return paths.filter((path) => existsSync(path)).map((path) => readFileSync(path, 'utf8'));
}

function finding(content: string, needles: string[]): DependencyFinding {
  const evidence = needles.filter((needle) => content.includes(needle));
  return { found: evidence.length > 0, evidence };
}

function includesAny(content: string, needles: string[]): boolean {
  return needles.some((needle) => content.includes(needle));
}

function findConfigFiles(root: string): string[] {
  const resourceRoot = join(root, 'src/main/resources');
  if (!existsSync(resourceRoot)) {
    return [];
  }

  return readdirSync(resourceRoot)
    .map((name) => join(resourceRoot, name))
    .filter((path) => statSync(path).isFile())
    .filter((path) => /application\.(properties|ya?ml)$/.test(path));
}
