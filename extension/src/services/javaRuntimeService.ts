import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

export interface JavaRuntime {
  majorVersion: number;
  version: string;
  home: string;
  javaCommand: string;
  label: string;
}

export function detectProjectJavaVersion(workspaceRoot: string): number | undefined {
  const gradleKts = readIfExists(join(workspaceRoot, 'build.gradle.kts'));
  const gradle = readIfExists(join(workspaceRoot, 'build.gradle'));
  const pom = readIfExists(join(workspaceRoot, 'pom.xml'));

  return detectFromGradle(gradleKts ?? gradle ?? '') ?? detectFromMaven(pom ?? '');
}

export async function discoverInstalledJavaRuntimes(): Promise<JavaRuntime[]> {
  if (process.platform === 'darwin') {
    const result = await runProcess('/usr/libexec/java_home', ['-V']);
    const parsed = parseMacJavaHomeList(`${result.stdout}\n${result.stderr}`);
    if (parsed.length > 0) {
      return parsed;
    }
  }

  const result = await runProcess('java', ['-version']);
  const version = parseJavaVersion(`${result.stdout}\n${result.stderr}`);
  if (!version) {
    return [];
  }
  return [
    {
      majorVersion: version.majorVersion,
      version: version.version,
      home: '',
      javaCommand: 'java',
      label: `Java ${version.majorVersion} (${version.version}) on PATH`
    }
  ];
}

export function parseMacJavaHomeList(output: string): JavaRuntime[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => {
      const match = line.match(/^(\d+(?:\.\d+)*).*?\s(\/.+\/Contents\/Home)$/);
      if (!match) {
        return undefined;
      }

      const majorVersion = parseJavaMajor(match[1]);
      const home = match[2];
      return {
        majorVersion,
        version: match[1],
        home,
        javaCommand: join(home, 'bin/java'),
        label: `Java ${majorVersion} (${match[1]}) - ${home}`
      };
    })
    .filter((runtime): runtime is JavaRuntime => runtime !== undefined)
    .sort((left, right) => right.majorVersion - left.majorVersion);
}

export function selectJavaRuntime(targetVersion: number | undefined, runtimes: JavaRuntime[]): JavaRuntime | undefined {
  if (runtimes.length === 0) {
    return undefined;
  }
  if (!targetVersion) {
    return runtimes[0];
  }

  return (
    runtimes.find((runtime) => runtime.majorVersion === targetVersion) ??
    runtimes.find((runtime) => runtime.majorVersion > targetVersion) ??
    runtimes[0]
  );
}

function detectFromGradle(content: string): number | undefined {
  return firstVersion([
    /JavaLanguageVersion\.of\((\d+)\)/,
    /languageVersion\s*=\s*JavaLanguageVersion\.of\((\d+)\)/,
    /sourceCompatibility\s*=\s*(?:JavaVersion\.VERSION_)?['"]?(\d+)(?:_\d+)?['"]?/,
    /targetCompatibility\s*=\s*(?:JavaVersion\.VERSION_)?['"]?(\d+)(?:_\d+)?['"]?/
  ], content);
}

function detectFromMaven(content: string): number | undefined {
  return firstVersion([
    /<maven\.compiler\.release>(\d+)<\/maven\.compiler\.release>/,
    /<maven\.compiler\.target>(\d+)<\/maven\.compiler\.target>/,
    /<maven\.compiler\.source>(\d+)<\/maven\.compiler\.source>/,
    /<java\.version>(\d+)<\/java\.version>/
  ], content);
}

function firstVersion(patterns: RegExp[], content: string): number | undefined {
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return parseJavaMajor(match[1]);
    }
  }
  return undefined;
}

function parseJavaVersion(output: string): { majorVersion: number; version: string } | undefined {
  const match = output.match(/version "([^"]+)"/);
  if (!match) {
    return undefined;
  }
  return { version: match[1], majorVersion: parseJavaMajor(match[1]) };
}

function parseJavaMajor(version: string): number {
  const parts = version.split('.');
  if (parts[0] === '1' && parts[1]) {
    return Number.parseInt(parts[1], 10);
  }
  return Number.parseInt(parts[0], 10);
}

function readIfExists(path: string): string | undefined {
  return existsSync(path) ? readFileSync(path, 'utf8') : undefined;
}

function runProcess(executable: string, args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve) => {
    const child = spawn(executable, args, { shell: false, env: process.env });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', (error) => resolve({ stdout: '', stderr: error.message, exitCode: null }));
    child.on('close', (exitCode) =>
      resolve({
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
        exitCode
      })
    );
  });
}
