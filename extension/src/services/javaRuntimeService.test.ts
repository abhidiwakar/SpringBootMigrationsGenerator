import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  detectProjectJavaVersion,
  parseMacJavaHomeList,
  selectJavaRuntime
} from './javaRuntimeService';

function withTempProject(run: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'slcg-java-'));
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('detectProjectJavaVersion', () => {
  it('reads Gradle toolchain languageVersion', () => {
    withTempProject((root) => {
      writeFileSync(
        join(root, 'build.gradle.kts'),
        [
          'java {',
          '  toolchain {',
          '    languageVersion.set(JavaLanguageVersion.of(21))',
          '  }',
          '}'
        ].join('\n')
      );

      assert.equal(detectProjectJavaVersion(root), 21);
    });
  });

  it('reads Maven compiler release', () => {
    withTempProject((root) => {
      writeFileSync(
        join(root, 'pom.xml'),
        [
          '<project>',
          '  <properties>',
          '    <maven.compiler.release>21</maven.compiler.release>',
          '  </properties>',
          '</project>'
        ].join('\n')
      );

      assert.equal(detectProjectJavaVersion(root), 21);
    });
  });
});

describe('parseMacJavaHomeList', () => {
  it('parses installed JVMs from java_home -V stderr output', () => {
    const runtimes = parseMacJavaHomeList(
      [
        'Matching Java Virtual Machines (2):',
        '    21.0.2 (arm64) "Eclipse Adoptium" - "Temurin 21.0.2" /Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home',
        '    17.0.14 (arm64) "Eclipse Adoptium" - "Temurin 17.0.14" /Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home'
      ].join('\n')
    );

    assert.deepEqual(runtimes.map((runtime) => runtime.majorVersion), [21, 17]);
    assert.equal(runtimes[0].javaCommand, '/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home/bin/java');
  });
});

describe('selectJavaRuntime', () => {
  it('selects the runtime matching the project target', () => {
    const selected = selectJavaRuntime(21, [
      {
        majorVersion: 17,
        version: '17.0.14',
        home: '/jdk17',
        javaCommand: '/jdk17/bin/java',
        label: 'Java 17'
      },
      {
        majorVersion: 21,
        version: '21.0.2',
        home: '/jdk21',
        javaCommand: '/jdk21/bin/java',
        label: 'Java 21'
      }
    ]);

    assert.equal(selected?.javaCommand, '/jdk21/bin/java');
  });
});
