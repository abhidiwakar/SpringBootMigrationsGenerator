# Spring Liquibase Changelog Generator

VS Code extension for Spring Boot projects that prepares reviewable Liquibase changelogs and validates Liquibase/JPA/PostgreSQL setup.

## Commands

- Spring Liquibase: Validate Setup
- Spring Liquibase: Configure Liquibase
- Spring Liquibase: Generate Initial Changelog
- Spring Liquibase: Generate Diff Changelog From Entities
- Spring Liquibase: Preview Changelog
- Spring Liquibase: Add Changelog To Master File
- Spring Liquibase: Generate Rollback Preview
- Spring Liquibase: Select Java Runtime

## Notes

The extension does not apply database changes automatically. Generated changelogs are saved under the configured changelog root and then opened for review. Entity-based generation requires a working project runtime classpath.

The extension auto-detects the project Java target from Maven or Gradle and selects a matching installed Java runtime when possible. Use `Spring Liquibase: Select Java Runtime` to override the detected choice.

Entity diff generation auto-detects the Spring Boot base package from the package declaration of the `@SpringBootApplication` class under `src/main/java` or `src/main/kotlin`. If more than one application class is found, the extension asks you to choose one. If none is found, it falls back to a manual package prompt.

For Spring Boot 3 / Hibernate 6 projects, keep `org.liquibase.ext:liquibase-hibernate6` on the project classpath.

For Spring Boot 4 / Hibernate 7 projects, the extension automatically prepares Liquibase `5.0.3` plus `liquibase-hibernate7` `5.0.3` from the official Liquibase Hibernate release and prepends those jars to the entity diff command. If downloads are disabled in your environment, set `springLiquibaseGenerator.liquibaseCore5JarPath` and `springLiquibaseGenerator.liquibaseHibernate7JarPath` to local jar paths.
