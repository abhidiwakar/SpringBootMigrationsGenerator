# Java Runtime Auto Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-select a compatible Java executable for Liquibase generation and provide a manual Java runtime picker fallback.

**Architecture:** Add pure Java runtime detection services for project target parsing, installed runtime parsing, and selection. Keep VS Code interaction in a command and use the resolver from generation commands before launching Liquibase.

**Tech Stack:** TypeScript, Node child processes, VS Code Extension API, Node test runner.

---

### Task 1: Pure Java Runtime Detection

**Files:**
- Create: `extension/src/services/javaRuntimeService.ts`
- Create: `extension/src/services/javaRuntimeService.test.ts`

- [ ] Write tests for parsing Gradle/Maven Java target versions and macOS `/usr/libexec/java_home -V` output.
- [ ] Run `npm test` and verify the new tests fail because the service does not exist.
- [ ] Implement target detection, Java home output parsing, and selection by target major version.
- [ ] Run `npm test` and verify the new tests pass.

### Task 2: Runtime Resolution And Picker Command

**Files:**
- Create: `extension/src/commands/selectJavaRuntime.ts`
- Modify: `extension/src/commands/generateInitialChangelog.ts`
- Modify: `extension/src/commands/generateDiffChangelog.ts`
- Modify: `extension/src/extension.ts`
- Modify: `extension/package.json`

- [ ] Add a `Spring Liquibase: Select Java Runtime` command.
- [ ] Resolve Java command for generation from saved setting, project target version, and detected installed runtimes.
- [ ] If no matching runtime is found, fall back to the saved setting or `java`.
- [ ] Update extension metadata and bump version.

### Task 3: Verification And Packaging

**Files:**
- Modify as needed based on verification.

- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Run `npm audit`.
- [ ] Package a new VSIX.

## Self-Review

This plan covers the approved behavior: automatic project Java detection, installed JVM discovery, manual picker fallback, generation command integration, and verified packaging.
