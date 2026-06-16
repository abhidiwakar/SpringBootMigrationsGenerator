import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { detectProject } from './projectDetector';

function withTempProject(run: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'slcg-'));
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('detectProject', () => {
  it('detects Maven Spring Boot Liquibase JPA PostgreSQL projects', () => {
    withTempProject((root) => {
      mkdirSync(join(root, 'src/main/resources'), { recursive: true });
      writeFileSync(
        join(root, 'pom.xml'),
        `<project>
          <dependencies>
            <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
            <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>
            <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-liquibase</artifactId></dependency>
            <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId></dependency>
            <dependency><groupId>org.liquibase.ext</groupId><artifactId>liquibase-hibernate6</artifactId></dependency>
          </dependencies>
        </project>`
      );
      writeFileSync(join(root, 'src/main/resources/application.properties'), 'spring.datasource.url=${DB_URL}\n');

      const result = detectProject(root);

      assert.equal(result.buildTool, 'maven');
      assert.equal(result.isSpringBoot, true);
      assert.equal(result.liquibase.found, true);
      assert.equal(result.jpa.found, true);
      assert.equal(result.postgresql.found, true);
      assert.equal(result.liquibaseHibernate.found, true);
      assert.equal(result.configFiles.length, 1);
    });
  });

  it('detects Gradle Kotlin build files', () => {
    withTempProject((root) => {
      writeFileSync(
        join(root, 'build.gradle.kts'),
        `plugins { id("org.springframework.boot") version "3.3.0" }
         dependencies {
           implementation("org.springframework.boot:spring-boot-starter-data-jpa")
           implementation("org.liquibase:liquibase-core")
           runtimeOnly("org.postgresql:postgresql")
         }`
      );

      const result = detectProject(root);

      assert.equal(result.buildTool, 'gradle');
      assert.equal(result.isSpringBoot, true);
      assert.equal(result.liquibase.found, true);
      assert.equal(result.jpa.found, true);
      assert.equal(result.postgresql.found, true);
    });
  });

  it('infers Hibernate 7 from Spring Boot 4 projects', () => {
    withTempProject((root) => {
      writeFileSync(
        join(root, 'build.gradle.kts'),
        `plugins { id("org.springframework.boot") version "4.0.0" }
         dependencies {
           implementation("org.springframework.boot:spring-boot-starter-data-jpa")
           implementation("org.liquibase:liquibase-core")
         }`
      );

      const result = detectProject(root);

      assert.equal(result.hibernateMajor, 7);
    });
  });

  it('infers Hibernate 7 from Maven Spring Boot 4 parent projects', () => {
    withTempProject((root) => {
      writeFileSync(
        join(root, 'pom.xml'),
        `<project>
          <parent>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-parent</artifactId>
            <version>4.0.0</version>
          </parent>
        </project>`
      );

      const result = detectProject(root);

      assert.equal(result.hibernateMajor, 7);
    });
  });


  it('detects liquibase-hibernate7 as a Liquibase Hibernate integration', () => {
    withTempProject((root) => {
      writeFileSync(
        join(root, 'pom.xml'),
        `<project>
          <dependencies>
            <dependency><groupId>org.liquibase.ext</groupId><artifactId>liquibase-hibernate7</artifactId></dependency>
          </dependencies>
        </project>`
      );

      const result = detectProject(root);

      assert.equal(result.liquibaseHibernate.found, true);
      assert.deepEqual(result.liquibaseHibernate.evidence, ['liquibase-hibernate', 'liquibase-hibernate7']);
    });
  });
});
