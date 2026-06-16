import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { spawn } from 'node:child_process';
import type { BuildTool, LiquibaseCommand } from '../types';
import { redactSecrets } from '../services/safetyService';
import { resolveHibernateAwareLiquibaseClasspath, type Hibernate7LiquibaseToolingOptions } from './liquibaseToolingResolver';

export interface JavaLiquibaseCommandOptions {
  javaCommand: string;
  classpath: string[];
  liquibaseArgs: string[];
  secrets: string[];
}

export interface ResolveLiquibaseInvocationOptions {
  workspaceRoot: string;
  buildTool: BuildTool;
  javaCommand: string;
  liquibaseArgs: string[];
  secrets: string[];
  hibernateIntegration?: 'none' | 'auto';
  hibernate7Tooling?: Hibernate7LiquibaseToolingOptions;
}

export interface ClasspathResolution {
  classpath: string[];
  diagnostics: string[];
}

export async function resolveProjectLiquibaseInvocation(
  options: ResolveLiquibaseInvocationOptions
): Promise<LiquibaseCommand> {
  const classpathResolution =
    options.buildTool === 'gradle'
      ? await resolveGradleRuntimeClasspath(options.workspaceRoot)
      : options.buildTool === 'maven'
        ? await resolveMavenRuntimeClasspath(options.workspaceRoot)
        : undefined;

  if (!classpathResolution) {
    throw new Error('Cannot resolve Liquibase classpath: unsupported or missing build tool.');
  }

  const classpath =
    options.hibernateIntegration === 'auto'
      ? await resolveHibernateAwareLiquibaseClasspath(classpathResolution.classpath, options.hibernate7Tooling)
      : classpathResolution.classpath;

  return buildJavaLiquibaseCommand({
    javaCommand: options.javaCommand,
    classpath,
    liquibaseArgs: options.liquibaseArgs,
    secrets: options.secrets
  });
}

export function buildJavaLiquibaseCommand(options: JavaLiquibaseCommandOptions): LiquibaseCommand {
  const args = ['-cp', options.classpath.join(delimiter), 'liquibase.integration.commandline.Main', ...options.liquibaseArgs];
  const displayCommand = redactSecrets(
    [options.javaCommand, ...args].join(' ').replace(/--password=([^\s]+)/g, '--password=***'),
    options.secrets
  );

  return {
    executable: options.javaCommand,
    args,
    displayCommand,
    secrets: options.secrets
  };
}

export function getBuildToolCommand(workspaceRoot: string, buildTool: Extract<BuildTool, 'gradle' | 'maven'>): string {
  if (buildTool === 'gradle') {
    const wrapper = process.platform === 'win32' ? join(workspaceRoot, 'gradlew.bat') : join(workspaceRoot, 'gradlew');
    return existsSync(wrapper) ? wrapper : 'gradle';
  }

  const wrapper = process.platform === 'win32' ? join(workspaceRoot, 'mvnw.cmd') : join(workspaceRoot, 'mvnw');
  return existsSync(wrapper) ? wrapper : 'mvn';
}

async function resolveGradleRuntimeClasspath(workspaceRoot: string): Promise<ClasspathResolution> {
  const taskName = 'springLiquibaseGeneratorPrintRuntimeClasspath';
  const initScript = join(mkdtempSync(join(tmpdir(), 'spring-liquibase-gradle-')), 'init.gradle');
  writeFileSync(
    initScript,
    [
      'allprojects { project ->',
      `  tasks.register("${taskName}") {`,
      '    doLast {',
      '      def runtime = project.configurations.findByName("runtimeClasspath")',
      '      if (runtime == null) { throw new GradleException("runtimeClasspath configuration not found") }',
      '      def entries = []',
      '      def mainClasses = new File(project.buildDir, "classes/java/main")',
      '      def mainKotlinClasses = new File(project.buildDir, "classes/kotlin/main")',
      '      def resources = new File(project.buildDir, "resources/main")',
      '      [mainClasses, mainKotlinClasses, resources].findAll { it.exists() }.each { entries << it.absolutePath }',
      '      entries.addAll(runtime.resolve().collect { it.absolutePath })',
      '      println "SLCG_CLASSPATH=" + entries.join(File.pathSeparator)',
      '    }',
      '  }',
      '}',
      ''
    ].join('\n'),
    'utf8'
  );

  const result = await runProcess(getBuildToolCommand(workspaceRoot, 'gradle'), ['-q', '--init-script', initScript, taskName], workspaceRoot);
  if (result.exitCode !== 0) {
    throw new Error(`Gradle classpath resolution failed: ${result.stderr || result.stdout}`);
  }

  return {
    classpath: extractClasspath(result.stdout),
    diagnostics: []
  };
}

async function resolveMavenRuntimeClasspath(workspaceRoot: string): Promise<ClasspathResolution> {
  const outputFile = join(mkdtempSync(join(tmpdir(), 'spring-liquibase-maven-')), 'classpath.txt');
  const result = await runProcess(
    getBuildToolCommand(workspaceRoot, 'maven'),
    ['-q', 'dependency:build-classpath', `-Dmdep.outputFile=${outputFile}`, '-DincludeScope=runtime'],
    workspaceRoot
  );
  if (result.exitCode !== 0) {
    throw new Error(`Maven classpath resolution failed: ${result.stderr || result.stdout}`);
  }

  const dependencyClasspath = existsSync(outputFile) ? readFileSync(outputFile, 'utf8').trim() : '';
  const classpath = [
    join(workspaceRoot, 'target/classes'),
    ...dependencyClasspath.split(delimiter).filter((entry) => entry.trim().length > 0)
  ];

  return { classpath, diagnostics: [] };
}

function extractClasspath(stdout: string): string[] {
  const line = stdout
    .split(/\r?\n/)
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate.startsWith('SLCG_CLASSPATH='));
  if (!line) {
    throw new Error('Build tool did not print a runtime classpath.');
  }
  return line
    .slice('SLCG_CLASSPATH='.length)
    .split(delimiter)
    .filter((entry) => entry.length > 0);
}

function runProcess(executable: string, args: string[], cwd: string): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(executable, args, { cwd, shell: false, env: process.env });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', (error) => resolve({ exitCode: null, stdout: '', stderr: error.message }));
    child.on('close', (exitCode) =>
      resolve({
        exitCode,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8')
      })
    );
  });
}
