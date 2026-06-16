import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { detectSpringBootApplicationPackages } from './springBootApplicationDetector';

function withTempProject(run: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'slcg-spring-app-'));
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('detectSpringBootApplicationPackages', () => {
  it('detects the package from a Java SpringBootApplication class', () => {
    withTempProject((root) => {
      const appPath = join(root, 'src/main/java/in/co/devabhi/url_shortner/UrlShortnerApplication.java');
      mkdirSync(join(appPath, '..'), { recursive: true });
      writeFileSync(
        appPath,
        `package in.co.devabhi.url_shortner;

import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class UrlShortnerApplication {}
`
      );

      const result = detectSpringBootApplicationPackages(root);

      assert.deepEqual(result.map((candidate) => candidate.packageName), ['in.co.devabhi.url_shortner']);
      assert.equal(result[0]?.filePath, appPath);
    });
  });

  it('detects the package from a Kotlin SpringBootApplication class', () => {
    withTempProject((root) => {
      const appPath = join(root, 'src/main/kotlin/com/example/demo/DemoApplication.kt');
      mkdirSync(join(appPath, '..'), { recursive: true });
      writeFileSync(
        appPath,
        `package com.example.demo

import org.springframework.boot.autoconfigure.SpringBootApplication

@SpringBootApplication
class DemoApplication
`
      );

      const result = detectSpringBootApplicationPackages(root);

      assert.deepEqual(result.map((candidate) => candidate.packageName), ['com.example.demo']);
    });
  });

  it('ignores SpringBootApplication classes outside main source roots', () => {
    withTempProject((root) => {
      const testPath = join(root, 'src/test/java/com/example/TestApplication.java');
      mkdirSync(join(testPath, '..'), { recursive: true });
      writeFileSync(
        testPath,
        `package com.example;

@SpringBootApplication
class TestApplication {}
`
      );

      const result = detectSpringBootApplicationPackages(root);

      assert.deepEqual(result, []);
    });
  });
});
