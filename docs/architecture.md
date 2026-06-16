# Architecture

The project is split into a VS Code extension package under `extension` and a reserved `java-helper` folder for future Hibernate metadata support.

## Extension package

- `src/extension.ts` registers commands, the sidebar provider, and shared logging.
- `src/commands` contains thin VS Code command handlers.
- `src/services` contains deterministic project, config, changelog, database, secret, and safety logic.
- `src/liquibase` contains command construction, execution boundaries, and Hibernate reference URL validation.
- `src/ui` contains sidebar and preview helpers.
- `src/utils` contains reusable path, YAML, logging, and sanitization helpers.

## Design boundary

The extension does not parse Java entity files. It prepares and validates real Liquibase and `liquibase-hibernate` integration paths. If the classpath or Hibernate setup is incomplete, generation fails with instructions instead of hardcoded example changelogs.

## Current generation path

The MVP runs Liquibase `generateChangelog` and `diffChangelog` commands against temporary changelog files, then opens the generated content in an unsaved preview editor. The extension does not apply changes to the database and does not save generated changelogs into the project without an explicit user action.
