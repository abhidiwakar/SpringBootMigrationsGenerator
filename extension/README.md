# Spring Liquibase Changelog Generator

VS Code extension for Spring Boot projects that prepares reviewable Liquibase changelogs and validates Liquibase/JPA/PostgreSQL setup.

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

## Notes

The extension does not apply database changes automatically. Generated changelogs are saved under the configured changelog root and then opened for review. Entity-based generation requires a working project runtime classpath.

The extension auto-detects the project Java target from Maven or Gradle and selects a matching installed Java runtime when possible. Use `Spring Liquibase: Select Java Runtime` to override the detected choice.

Entity diff generation auto-detects the Spring Boot base package from the package declaration of the `@SpringBootApplication` class under `src/main/java` or `src/main/kotlin`. If more than one application class is found, the extension asks you to choose one. If none is found, it falls back to a manual package prompt.

For Spring Boot 3 / Hibernate 6 projects, keep `org.liquibase.ext:liquibase-hibernate6` on the project classpath.

For Spring Boot 4 / Hibernate 7 projects, the extension automatically prepares Liquibase `5.0.3` plus `liquibase-hibernate7` `5.0.3` from the official Liquibase Hibernate release and prepends those jars to the entity diff command. If downloads are disabled in your environment, set `springLiquibaseGenerator.liquibaseCore5JarPath` and `springLiquibaseGenerator.liquibaseHibernate7JarPath` to local jar paths.
