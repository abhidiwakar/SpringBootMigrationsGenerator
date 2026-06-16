# Spring Liquibase Changelog Generator

A VS Code extension MVP for Spring Boot developers who want reviewable Liquibase changelogs instead of relying on `spring.jpa.hibernate.ddl-auto=update`.

The extension detects Spring Boot Maven/Gradle projects, reads Spring datasource and Liquibase configuration, validates key dependencies, prepares safe Liquibase generation commands, previews changelog content before saving, and can add YAML changelog includes to a master changelog.

## Why this exists

`ddl-auto=update` is convenient during local development, but it is not a production migration strategy. Production schema changes should be reviewed, versioned, committed, and applied through a migration tool. Liquibase provides structured changelogs, diffs, rollbacks, and database-aware migration workflows.

## MVP scope

- VS Code extension written in TypeScript.
- Maven and Gradle Spring Boot project detection.
- PostgreSQL-first validation.
- YAML changelog defaults.
- Spring `application.properties`, `application.yml`, and `application.yaml` parsing.
- Secret redaction and placeholder detection.
- Validation report command.
- Configure command for master changelog and default author.
- Preview-first initial and diff changelog generation through real Liquibase commands when local prerequisites are available.
- YAML master changelog include insertion.

This MVP does not fake Hibernate changelog generation. It runs Liquibase through the project's Maven or Gradle runtime classpath. Spring Boot 3 / Hibernate 6 projects should provide `liquibase-hibernate6`; Spring Boot 4 / Hibernate 7 projects use extension-managed Liquibase 5 and `liquibase-hibernate7` tooling for entity diffs.

## Commands

Start with validation, then configure the project, then generate and review changelogs as needed:

- `Spring Liquibase: Validate Setup` checks whether the open workspace looks like a supported Spring Boot project. Run this first after opening a project, and run it again when build dependencies, datasource settings, or Liquibase configuration change.
- `Spring Liquibase: Configure Liquibase` creates the configured master changelog if it is missing and stores the default changeset author. Run this after validation succeeds, or whenever you need to initialize the changelog layout for a project.
- `Spring Liquibase: Select Java Runtime` lets you choose the JDK used for Liquibase commands. Use this when auto-detection selects the wrong Java version or when the project requires a specific installed JDK.
- `Spring Liquibase: Generate Initial Changelog` runs Liquibase against the configured live database schema and saves a new changelog for the current schema state. Use this when introducing Liquibase to an existing database that already has tables and objects.
- `Spring Liquibase: Generate Diff Changelog From Entities` compares JPA/Hibernate entity metadata with the configured database and saves a changelog for the differences. Use this after changing entities and before committing the corresponding migration.
- `Spring Liquibase: Preview Changelog` reopens the latest generated changelog preview. Use this when you want to review generated content again before editing or adding it to the master changelog.
- `Spring Liquibase: Add Changelog To Master File` inserts a YAML include into the configured master changelog. Use this after you have reviewed and accepted a generated changelog file.
- `Spring Liquibase: Generate Rollback Preview` opens a rollback guidance preview for common changes. Use this while reviewing a changelog to plan rollback coverage; destructive or data-loss-prone rollback still requires manual review.

## Default changelog layout

```text
src/main/resources/db/changelog/db.changelog-master.yaml
src/main/resources/db/changelog/changes/001-initial-schema.yaml
src/main/resources/db/changelog/changes/002-add-users-table.yaml
```

The YAML master changelog uses includes:

```yaml
databaseChangeLog:
  - include:
      file: db/changelog/changes/001-initial-schema.yaml
```

## Safety guarantees

- The extension never runs `liquibase update`.
- The extension never modifies the database automatically.
- The extension never executes generated SQL automatically.
- Generated changelog content is previewed before saving.
- Database passwords are redacted from logs.
- Resolved secrets are not written into changelog files.
- Destructive schema changes require manual review.

## Local development

```bash
cd extension
npm install
npm test
npm run typecheck
npm run build
```

The compiled extension output is written to `extension/out`.

## Java runtime selection

The extension auto-detects the project Java target from Maven or Gradle and tries to choose a matching installed JVM. On macOS it uses `/usr/libexec/java_home -V`; otherwise it falls back to `java` on `PATH`.

You can override the selected Java with the command `Spring Liquibase: Select Java Runtime` or by setting:

```json
{
  "springLiquibaseGenerator.javaCommand": "/path/to/jdk/bin/java"
}
```
