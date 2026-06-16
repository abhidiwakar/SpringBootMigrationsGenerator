import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as vscode from 'vscode';
import { readGeneratedChangelog } from '../liquibase/generatedChangelogReader';
import { buildInitialChangelogArgs } from '../liquibase/liquibaseCommandBuilder';
import { explainLiquibaseFailure } from '../liquibase/liquibaseFailureDiagnostics';
import { resolveProjectLiquibaseInvocation } from '../liquibase/liquibaseInvocationResolver';
import { runLiquibase } from '../liquibase/liquibaseRunner';
import { generateNextFilename, listExistingChangelogFilenames, saveGeneratedChangelog } from '../services/changelogService';
import { readSpringConfig, resolveSpringPlaceholders } from '../services/configReader';
import { detectProject } from '../services/projectDetector';
import { openSavedChangelog } from '../ui/previewProvider';
import { Logger } from '../utils/logger';
import { resolveJavaCommand } from './selectJavaRuntime';

export async function generateInitialChangelog(workspaceRoot: string, logger: Logger): Promise<void> {
  const config = vscode.workspace.getConfiguration('springLiquibaseGenerator');
  const detection = detectProject(workspaceRoot);
  const springConfig = readSpringConfig(workspaceRoot);
  const url = resolveConfigValue(springConfig.values['spring.datasource.url']);
  const username = resolveConfigValue(springConfig.values['spring.datasource.username']);
  const password = resolveConfigValue(springConfig.values['spring.datasource.password']);

  if (typeof url !== 'string') {
    void vscode.window.showErrorMessage('Cannot generate changelog: spring.datasource.url is missing.');
    return;
  }

  const description = await vscode.window.showInputBox({
    title: 'Initial changelog description',
    prompt: 'Used for the generated filename and changeset IDs',
    value: 'initial schema'
  });
  if (!description) {
    return;
  }

  const changelogRoot = config.get<string>('changelogRoot') ?? 'src/main/resources/db/changelog';
  const filename = generateNextFilename(listExistingChangelogFilenames(workspaceRoot, changelogRoot), description);
  const tempDir = mkdtempSync(join(tmpdir(), 'spring-liquibase-generator-'));
  const changeLogFile = join(tempDir, filename);
  const liquibaseArgs = buildInitialChangelogArgs({
    changeLogFile,
    url,
    username,
    password,
    defaultSchemaName: config.get<string>('defaultSchema') ?? 'public'
  });
  const command = await resolveProjectLiquibaseInvocation({
    workspaceRoot,
    buildTool: detection.buildTool,
    javaCommand: await resolveJavaCommand(workspaceRoot, logger),
    liquibaseArgs: liquibaseArgs.args,
    secrets: liquibaseArgs.secrets
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(message);
    void vscode.window.showErrorMessage('Could not resolve the project Liquibase classpath. Check the Spring Liquibase output channel.');
    return undefined;
  });
  if (!command) {
    return;
  }

  logger.setSecrets(command.secrets);
  logger.info(`Prepared Liquibase initial changelog command: ${command.displayCommand}`);
  const result = await runLiquibase(command, workspaceRoot);
  logger.info(`Liquibase command exited with code: ${result.exitCode ?? 'unavailable'}`);
  if (result.stderr.trim()) {
    logger.warn(result.stderr.trim());
  }

  const generatedChangelog = readGeneratedChangelog(changeLogFile, result.stdout);
  if (result.exitCode !== 0) {
    if (result.stdout.trim()) {
      logger.info(result.stdout.trim());
    }
    const explanation = explainLiquibaseFailure(`${result.stderr}\n${result.stdout}`);
    if (explanation) {
      logger.error(explanation);
    }
    void vscode.window.showErrorMessage(explanation ?? 'Liquibase initial changelog generation failed. Check the Spring Liquibase output channel.');
    return;
  }

  if (!generatedChangelog) {
    if (result.stdout.trim()) {
      logger.info(result.stdout.trim());
    }
    logger.warn(
      'Liquibase completed successfully but did not generate a changelog file. generateChangelog reads the live database schema; if the database has no objects in the selected schema, there is nothing to write. For JPA entity-based generation, use "Spring Liquibase: Generate Diff Changelog From Entities" with liquibase-hibernate configured.'
    );
    void vscode.window.showWarningMessage(
      'Liquibase completed but produced no changelog. The selected database schema may be empty; use entity diff generation for JPA-based output.'
    );
    return;
  }

  const savedChangelog = saveGeneratedChangelog({
    workspaceRoot,
    changelogRoot,
    filename,
    content: generatedChangelog
  });
  logger.info(`Saved generated initial changelog: ${savedChangelog.relativePath}`);
  void vscode.window.showInformationMessage(`Generated changelog saved: ${savedChangelog.relativePath}`);
  await openSavedChangelog(savedChangelog.absolutePath, generatedChangelog);
}

function resolveConfigValue(value: string | boolean | number | null | undefined): string | undefined {
  return typeof value === 'string' ? resolveSpringPlaceholders(value) : undefined;
}
