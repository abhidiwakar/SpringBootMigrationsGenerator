# Spring Liquibase Changelog Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a narrow but real VS Code extension MVP for detecting Spring Boot Liquibase projects, validating setup, safely resolving config, previewing generated changelogs, and wiring real Liquibase command boundaries.

**Architecture:** The extension is a TypeScript package under `/extension`, with deterministic logic in testable services and VS Code-specific command/UI wiring kept thin. Liquibase generation is represented by command builders and runners that execute real commands when prerequisites are met, while incomplete Hibernate setup produces clear diagnostics rather than fake changelog output.

**Tech Stack:** VS Code Extension API, TypeScript, Vitest, js-yaml, fast-xml-parser, Node child processes, npm.

---

### Task 1: Extension Package Scaffold

**Files:**
- Create: `extension/package.json`
- Create: `extension/tsconfig.json`
- Create: `extension/vitest.config.ts`
- Create: `extension/src/test/setup.ts`
- Create: `extension/src/types.ts`

- [x] **Step 1: Create package metadata and scripts**

Create scripts for `test`, `typecheck`, and `build`. Add VS Code commands, settings, and sidebar contribution points.

- [x] **Step 2: Create strict TypeScript config**

Set CommonJS output to `out`, strict mode enabled, and include `src`.

### Task 2: Deterministic Service Tests

**Files:**
- Create: `extension/src/services/projectDetector.test.ts`
- Create: `extension/src/services/configReader.test.ts`
- Create: `extension/src/services/changelogService.test.ts`
- Create: `extension/src/services/safetyService.test.ts`
- Create: `extension/src/liquibase/liquibaseCommandBuilder.test.ts`

- [x] **Step 1: Write failing tests before production service code**

Tests cover Maven/Gradle detection, config parsing, sanitization, YAML include insertion, dangerous change classification, and password redaction.

- [x] **Step 2: Run tests and verify RED**

Run `npm test` in `extension`; expect missing modules or missing implementation failures before service code exists.

### Task 3: Core Services

**Files:**
- Create: `extension/src/services/projectDetector.ts`
- Create: `extension/src/services/configReader.ts`
- Create: `extension/src/services/changelogService.ts`
- Create: `extension/src/services/safetyService.ts`
- Create: `extension/src/utils/sanitizers.ts`
- Create: `extension/src/utils/yamlUtils.ts`
- Create: `extension/src/utils/pathUtils.ts`

- [x] **Step 1: Implement minimal service code to pass tests**

Implement deterministic parsers and pure helpers without VS Code dependencies where practical.

- [x] **Step 2: Run tests and verify GREEN**

Run `npm test` and fix service behavior until all deterministic tests pass.

### Task 4: Liquibase Boundaries

**Files:**
- Create: `extension/src/liquibase/liquibaseCommandBuilder.ts`
- Create: `extension/src/liquibase/liquibaseRunner.ts`
- Create: `extension/src/liquibase/hibernateReferenceBuilder.ts`

- [x] **Step 1: Implement command construction with redacted display commands**

Support initial and diff changelog command construction without logging secrets.

- [x] **Step 2: Implement runner boundary**

Use child processes with structured results and redacted output.

### Task 5: VS Code Commands And UI

**Files:**
- Create: `extension/src/extension.ts`
- Create: `extension/src/commands/validateSetup.ts`
- Create: `extension/src/commands/configureLiquibase.ts`
- Create: `extension/src/commands/generateInitialChangelog.ts`
- Create: `extension/src/commands/generateDiffChangelog.ts`
- Create: `extension/src/commands/previewChangelog.ts`
- Create: `extension/src/commands/addChangelogToMaster.ts`
- Create: `extension/src/commands/generateRollbackPreview.ts`
- Create: `extension/src/services/secretService.ts`
- Create: `extension/src/services/databaseService.ts`
- Create: `extension/src/ui/sidebarProvider.ts`
- Create: `extension/src/ui/previewProvider.ts`
- Create: `extension/src/utils/logger.ts`

- [x] **Step 1: Wire commands thinly**

Commands call services, show readable messages, and never mutate databases.

- [x] **Step 2: Add sidebar provider**

Expose Project, Liquibase, Database, and Actions tree items.

### Task 6: Documentation

**Files:**
- Create: `README.md`
- Create: `docs/architecture.md`
- Create: `docs/usage.md`
- Create: `docs/limitations.md`
- Create: `docs/troubleshooting.md`
- Create: `java-helper/README.md`

- [x] **Step 1: Document usage and limitations honestly**

Document PostgreSQL/YAML MVP scope, `ddl-auto=update` warning, `liquibase-hibernate` requirements, and safety defaults.

### Task 7: Verification

**Files:**
- Modify: implementation files only as needed for fixes.

- [x] **Step 1: Run unit tests**

Run `npm test` in `extension`; expect all tests to pass.

- [x] **Step 2: Run typecheck**

Run `npm run typecheck`; expect no TypeScript errors.

- [x] **Step 3: Run build**

Run `npm run build`; expect compiled output under `extension/out`.

## Self-Review

The plan covers the approved spec's first implementation slice: extension scaffolding, project detection, config parsing, secret redaction, changelog naming/master include behavior, Liquibase command boundaries, command wiring, sidebar, docs, and verification. The entity diff path remains honest: it uses real Liquibase command construction and diagnostics, not hardcoded changelog examples.
