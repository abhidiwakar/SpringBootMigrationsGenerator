# Spring Liquibase Changelog Generator Design

Date: 2026-06-15

## Goal

Build a production-quality VS Code extension for Spring Boot developers that helps generate reviewable Liquibase changelogs from JPA/Hibernate entity models and database schema state.

The first implementation slice is a narrow but real MVP. It must provide a useful VS Code workflow, safe project validation, config discovery, changelog preview/save behavior, and real Liquibase integration boundaries without faking entity-based changelog generation.

## Product Principles

- Use Liquibase and Hibernate metadata paths where possible. Do not parse Java entity files with regex.
- Generate reviewable changelogs only. Never apply database updates automatically.
- Preview before save. Never silently write changelog files.
- Treat secrets as sensitive. Never log database passwords or write resolved secrets into generated files.
- Prefer correctness and explicit diagnostics over fake output.
- Default to PostgreSQL and YAML changelogs for the MVP.
- Design extension APIs so MySQL and additional changelog formats can be added later.

## Recommended Approach

Use an extension-first MVP with real Liquibase integration boundaries.

The VS Code extension should provide the product shell first: project detection, Spring config parsing, dependency checks, secret-safe datasource resolution, validation reports, changelog naming, preview/save flow, YAML master changelog updates, logging, and settings.

The Liquibase generation layer should invoke real Liquibase commands where configuration is sufficient. If entity diff prerequisites such as `liquibase-hibernate` or classpath configuration are incomplete, it should return actionable setup diagnostics instead of producing fake changelogs.

This approach gives users a safe, usable developer tool while keeping the hardest Hibernate integration path honest and extensible.

## Alternatives Considered

### Java-helper-first MVP

Build the Java helper that loads Hibernate metadata first, then wrap it with a thinner VS Code extension.

This attacks the hardest part first, but delays the usable VS Code experience and increases risk because Spring Boot startup, classpaths, naming strategies, profiles, and multi-module layouts vary heavily across projects.

### Liquibase CLI-only MVP

Use Liquibase CLI and `liquibase-hibernate` directly from the extension without a helper abstraction.

This is faster initially, but can become brittle around Maven/Gradle classpaths and custom Spring Boot mappings. The MVP may use this path where practical, but the architecture should keep room for a Java helper.

## Repository Structure

```text
/extension
  /src
    extension.ts
    commands/
      addChangelogToMaster.ts
      configureLiquibase.ts
      generateDiffChangelog.ts
      generateInitialChangelog.ts
      generateRollbackPreview.ts
      previewChangelog.ts
      validateSetup.ts
    services/
      changelogService.ts
      configReader.ts
      databaseService.ts
      projectDetector.ts
      secretService.ts
    liquibase/
      hibernateReferenceBuilder.ts
      liquibaseCommandBuilder.ts
      liquibaseRunner.ts
    ui/
      previewProvider.ts
      sidebarProvider.ts
    utils/
      logger.ts
      pathUtils.ts
      sanitizers.ts
      yamlUtils.ts
  package.json
  tsconfig.json

/java-helper
  README.md

/docs
  architecture.md
  limitations.md
  troubleshooting.md
  usage.md
```

The `/java-helper` folder is reserved for a later helper process that can load Spring Boot/Hibernate metadata more reliably when direct Liquibase Hibernate configuration is not enough.

## Architecture

### Extension Activation

`extension.ts` registers commands, settings, the output channel, the sidebar provider, and preview/save flows. Command handlers remain thin and delegate behavior to services.

### Project Detection

`projectDetector.ts` inspects the workspace for:

- Maven via `pom.xml`.
- Gradle via `build.gradle` or `build.gradle.kts`.
- Spring Boot dependencies.
- Liquibase dependencies: `spring-boot-starter-liquibase`, `liquibase-core`, Maven plugin, or Gradle plugin.
- JPA/Hibernate dependencies: `spring-boot-starter-data-jpa` or `hibernate-core`.
- PostgreSQL dependency: `org.postgresql:postgresql`.
- `liquibase-hibernate` dependency when entity diff generation is requested.
- Existing changelog root and master changelog.

The detector returns structured findings with severities and remediation text.

### Spring Config Reading

`configReader.ts` reads:

- `application.properties`
- `application.yml`
- `application.yaml`

Supported keys:

- `spring.liquibase.enabled`
- `spring.liquibase.change-log`
- `spring.liquibase.contexts`
- `spring.liquibase.default-schema`
- `spring.datasource.url`
- `spring.datasource.username`
- `spring.datasource.password`
- `spring.datasource.driver-class-name`
- `spring.jpa.hibernate.ddl-auto`
- `spring.jpa.hibernate.naming.physical-strategy`
- `spring.jpa.hibernate.naming.implicit-strategy`

If `spring.liquibase.change-log` is missing, the extension defaults to `classpath:db/changelog/db.changelog-master.yaml`.

### Secret Handling

`secretService.ts` resolves placeholders such as `${DB_URL}`, `${DB_USERNAME}`, and `${DB_PASSWORD}`.

Resolution order:

1. Environment variable if available to the extension process.
2. VS Code SecretStorage value if previously stored.
3. Secure VS Code input prompt.

Passwords must never be logged, written to changelogs, or written to generated `liquibase.properties`. If the user chooses to create config files, placeholders should be used by default.

### Changelog Service

`changelogService.ts` owns deterministic changelog behavior:

- Default changelog root: `src/main/resources/db/changelog`.
- Default changes folder: `src/main/resources/db/changelog/changes`.
- Default master changelog: `src/main/resources/db/changelog/db.changelog-master.yaml`.
- Default file pattern: `{number}-{description}.yaml`.
- Description sanitization: lowercase, spaces to hyphens, invalid characters removed, repeated hyphens collapsed, leading/trailing hyphens trimmed.
- Stable changeset IDs such as `001-create-users-table`.
- Project-level uniqueness checks for filenames and changeset IDs.
- YAML master include insertion with duplicate avoidance.

MVP master changelog mutation supports YAML first. XML, JSON, and formatted SQL support are designed for later.

### Liquibase Integration

`liquibaseCommandBuilder.ts` builds commands for real Liquibase operations. It must keep credentials masked in logs.

`liquibaseRunner.ts` executes commands, captures output, redacts secrets, and returns structured success/failure results.

`hibernateReferenceBuilder.ts` builds or validates entity reference configuration for `liquibase-hibernate`, including:

- Reference URL such as `hibernate:spring:{basePackage}?dialect=org.hibernate.dialect.PostgreSQLDialect` where practical.
- Hibernate dialect.
- Physical naming strategy.
- Implicit naming strategy.
- Build tool classpath readiness.

If the extension cannot safely configure `liquibase-hibernate`, it should return precise setup instructions and fail the generation command without producing fake changelog content.

### Sidebar

The sidebar should show:

- Project: Spring Boot detected, build tool, Java version if detectable.
- Liquibase: dependency status, master changelog status, format, existing changelog count.
- Database: database type, connection status, schema, datasource source file.
- Actions: generate initial changelog, generate diff changelog, validate setup, open master changelog, open changelog folder.

The sidebar is informational and command-oriented. It should not run database mutations.

## Commands

### Spring Liquibase: Validate Setup

Runs detection and validation:

- Spring Boot project detected.
- Build tool detected.
- Java available.
- Maven or Gradle available.
- Liquibase dependency present.
- JPA/Hibernate dependency present.
- PostgreSQL driver present.
- Datasource config found.
- Database connection works when credentials are available.
- Master changelog exists.
- Changelog folder exists.
- `liquibase-hibernate` available when entity diff generation is requested.

The command writes a readable validation report to the output channel and updates sidebar state. It redacts all secrets.

### Spring Liquibase: Configure Liquibase

Guides the user through safe configuration:

- Choose changelog root.
- Choose or create master YAML changelog.
- Set default author.
- Set database type and default schema.
- Resolve datasource placeholders through SecretStorage.

The MVP must ask before creating files. It must not silently modify Maven or Gradle build files.

### Spring Liquibase: Generate Initial Changelog

Purpose: generate a Liquibase changelog representing the current JPA/Hibernate entity model.

Flow:

1. Validate setup.
2. Build Liquibase/Hibernate reference configuration.
3. Run real Liquibase generation where prerequisites are met.
4. Classify risky changes.
5. Open the generated YAML in an unsaved preview editor.
6. Ask before saving.
7. Optionally add the saved changelog to the master changelog.

If entity metadata cannot be loaded, fail with setup diagnostics instead of fake output.

### Spring Liquibase: Generate Diff Changelog From Entities

Purpose: compare JPA/Hibernate expected schema against the live PostgreSQL schema.

Flow:

1. Validate setup.
2. Resolve datasource secrets safely.
3. Build reference side from `liquibase-hibernate` where possible.
4. Use the live database as target side.
5. Run a real Liquibase diff changelog operation.
6. Separate or clearly mark dangerous changes.
7. Open preview before save.

Safe changes may be generated normally:

- `createTable`
- `addColumn`
- `addPrimaryKey`
- `addForeignKeyConstraint`
- `createIndex`
- `addUniqueConstraint`
- `addDefaultValue`
- `addNotNullConstraint` only when safe or explicitly confirmed

Dangerous changes must not be silently generated as active changesets:

- `dropTable`
- `dropColumn`
- `renameTable`
- `renameColumn`
- `modifyDataType`
- Making a nullable column non-nullable
- Deleting indexes
- Deleting constraints

Dangerous changes should be commented out or placed in a manual-review section with a clear explanation.

### Spring Liquibase: Preview Changelog

Opens the latest generated temporary changelog or a selected changelog file for review.

Preview actions:

- Save changelog.
- Add to master changelog.
- Copy changelog.
- Regenerate.
- Cancel.

### Spring Liquibase: Add Changelog To Master File

Adds a YAML include entry to the master changelog:

```yaml
databaseChangeLog:
  - include:
      file: db/changelog/changes/001-initial-schema.yaml
```

The command avoids duplicate includes and reports malformed YAML clearly.

### Spring Liquibase: Generate Rollback Preview

Generates rollback preview where Liquibase or obvious inverse changes support it.

Safe rollback examples:

- `createTable` rollback is `dropTable`.
- `addColumn` rollback is `dropColumn`.
- `createIndex` rollback is `dropIndex`.

Risky rollback should be marked with explicit manual-review comments in the preview.

## Safety Rules

- Never run `liquibase update`.
- Never modify the database automatically.
- Never execute generated SQL automatically.
- Never use `ddl-auto=update` as part of generation.
- Warn when `spring.jpa.hibernate.ddl-auto=update` is detected.
- Recommend production config:

```properties
spring.jpa.hibernate.ddl-auto=validate
spring.liquibase.enabled=true
```

- Never print secrets in logs.
- Never write resolved secrets into changelogs.
- Never save destructive changes unless the user explicitly confirms.

## Settings

The extension contributes:

- `springLiquibaseGenerator.changelogFormat`
- `springLiquibaseGenerator.changelogRoot`
- `springLiquibaseGenerator.masterChangelog`
- `springLiquibaseGenerator.defaultAuthor`
- `springLiquibaseGenerator.databaseType`
- `springLiquibaseGenerator.defaultSchema`
- `springLiquibaseGenerator.safeMode`
- `springLiquibaseGenerator.javaCommand`
- `springLiquibaseGenerator.mavenCommand`
- `springLiquibaseGenerator.gradleCommand`
- `springLiquibaseGenerator.hibernateDialect`
- `springLiquibaseGenerator.hibernatePhysicalNamingStrategy`
- `springLiquibaseGenerator.hibernateImplicitNamingStrategy`

MVP defaults:

- Format: YAML
- Database type: PostgreSQL
- Safe mode: enabled

## Testing Strategy

Unit tests should cover:

- Maven dependency detection.
- Gradle dependency detection.
- Spring Boot, Liquibase, JPA/Hibernate, PostgreSQL, and `liquibase-hibernate` detection.
- `application.properties` parsing.
- `application.yml` and `application.yaml` parsing.
- Placeholder detection and unresolved placeholder reporting.
- Secret redaction in log messages and command output.
- Description sanitization.
- Changelog filename generation.
- Changeset ID generation and duplicate avoidance.
- YAML master changelog include insertion.
- Duplicate include avoidance.
- Dangerous change classification.
- Liquibase command construction without leaking passwords.

Verification commands should include extension unit tests, TypeScript typecheck, lint if configured, and package/build checks.

## Documentation

Create documentation for:

- What the extension does.
- Why `ddl-auto=update` is unsafe for production.
- Why Liquibase is used.
- How Liquibase changelogs work.
- How to generate an initial changelog.
- How to generate a diff changelog from JPA entities.
- How to configure PostgreSQL.
- How to configure `liquibase-hibernate`.
- How to use YAML changelogs.
- How to add generated changelogs to the master changelog.
- How to review generated changes safely.
- Troubleshooting and limitations.

## MVP Limitations

The MVP documents these limitations honestly:

- PostgreSQL only.
- YAML changelogs first.
- Complex renames require manual review.
- Destructive changes are not auto-applied.
- Some custom Hibernate mappings may need manual adjustment.
- The Spring application must be startable enough to load JPA/Hibernate metadata.
- `liquibase-hibernate` configuration may need manual tuning for complex projects.
- Multi-module builds may require manual classpath configuration.
- XML, JSON, and formatted SQL changelog mutation are deferred.

## Acceptance Criteria

- A user can open a Spring Boot Maven or Gradle project in VS Code.
- A user can run Validate Setup and get a useful report.
- The extension detects core dependencies and datasource configuration.
- The extension warns about missing Liquibase, JPA/Hibernate, PostgreSQL, or `liquibase-hibernate` dependencies.
- The extension safely resolves datasource placeholders without leaking secrets.
- The extension can create or locate a YAML master changelog after explicit confirmation.
- Generated changelogs are previewed before saving.
- Generated changelogs use YAML by default.
- Generated changesets have meaningful IDs and authors where generation succeeds.
- A saved changelog can be included in the master changelog without duplicate includes.
- The extension never exposes secrets.
- The extension never modifies the database automatically.
- The code is modular and maintainable.
- The README explains usage and limitations clearly.

## Open Implementation Notes

- The initial implementation should scaffold the extension and implement deterministic, testable services first.
- Real Liquibase invocation should be wired through command adapters and covered by command-construction tests.
- If full Hibernate diff generation is not reliable in the first pass, the command must fail with precise instructions instead of producing placeholder changelogs.
- The Java helper should only be expanded when direct Liquibase Hibernate integration proves insufficient in real sample projects.
