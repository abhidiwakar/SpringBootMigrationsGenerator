import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as vscode from 'vscode';
import { readGeneratedChangelog } from '../liquibase/generatedChangelogReader';
import { buildHibernateReference } from '../liquibase/hibernateReferenceBuilder';
import { buildDiffChangelogArgs } from '../liquibase/liquibaseCommandBuilder';
import { explainLiquibaseFailure } from '../liquibase/liquibaseFailureDiagnostics';
import { resolveProjectLiquibaseInvocation } from '../liquibase/liquibaseInvocationResolver';
import { runLiquibase } from '../liquibase/liquibaseRunner';
import { generateNextFilename, listExistingChangelogFilenames, saveGeneratedChangelog } from '../services/changelogService';
import { readSpringConfig, resolveSpringPlaceholders } from '../services/configReader';
import { detectProject } from '../services/projectDetector';
import { detectSpringBootApplicationPackages } from '../services/springBootApplicationDetector';
import { openSavedChangelog } from '../ui/previewProvider';
import { Logger } from '../utils/logger';
import { resolveJavaCommand } from './selectJavaRuntime';

export async function generateDiffChangelog(workspaceRoot: string, logger: Logger, globalStoragePath?: string): Promise<void> {
  const settings = vscode.workspace.getConfiguration('springLiquibaseGenerator');
  const detection = detectProject(workspaceRoot);
  const springConfig = readSpringConfig(workspaceRoot);
  const basePackage = await resolveSpringBootBasePackage(workspaceRoot, logger);

  const reference = buildHibernateReference(detection, springConfig, basePackage);
  if (!reference.referenceUrl) {
    const message = reference.issues.map((issue) => `${issue.message} ${issue.remediation ?? ''}`).join('\n');
    logger.error(message);
    void vscode.window.showErrorMessage('Cannot generate entity diff changelog until liquibase-hibernate setup is complete.');
    return;
  }

  const url = resolveConfigValue(springConfig.values['spring.datasource.url']);
  if (typeof url !== 'string') {
    void vscode.window.showErrorMessage('Cannot generate diff changelog: spring.datasource.url is missing.');
    return;
  }

  const description = await vscode.window.showInputBox({
    title: 'Diff changelog description',
    prompt: 'Used for the generated filename and changeset IDs',
    value: 'entity diff'
  });
  if (!description) {
    return;
  }

  const changelogRoot = settings.get<string>('changelogRoot') ?? 'src/main/resources/db/changelog';
  const filename = generateNextFilename(listExistingChangelogFilenames(workspaceRoot, changelogRoot), description);
  const tempDir = mkdtempSync(join(tmpdir(), 'spring-liquibase-generator-'));
  const changeLogFile = join(tempDir, filename);
  const liquibaseArgs = buildDiffChangelogArgs({
    changeLogFile,
    url,
    username:
      resolveConfigValue(springConfig.values['spring.datasource.username']),
    password:
      resolveConfigValue(springConfig.values['spring.datasource.password']),
    defaultSchemaName: settings.get<string>('defaultSchema') ?? 'public',
    referenceUrl: reference.referenceUrl
  });
  const command = await resolveProjectLiquibaseInvocation({
    workspaceRoot,
    buildTool: detection.buildTool,
    javaCommand: await resolveJavaCommand(workspaceRoot, logger),
    liquibaseArgs: liquibaseArgs.args,
    secrets: liquibaseArgs.secrets,
    hibernateIntegration: 'auto',
    hibernate7Tooling: globalStoragePath
      ? {
          toolsDirectory: join(globalStoragePath, 'liquibase-tools'),
          liquibaseCoreJarPath: settings.get<string>('liquibaseCore5JarPath') ?? '',
          liquibaseHibernateJarPath: settings.get<string>('liquibaseHibernate7JarPath') ?? '',
          allowDownloads: settings.get<boolean>('autoDownloadHibernate7Tooling') ?? true,
          logger
        }
      : undefined
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
  logger.info(`Prepared Liquibase diff changelog command: ${command.displayCommand}`);
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
    void vscode.window.showErrorMessage(explanation ?? 'Liquibase diff changelog generation failed. Check the Spring Liquibase output channel.');
    return;
  }

  if (!generatedChangelog) {
    if (result.stdout.trim()) {
      logger.info(result.stdout.trim());
    }
    logger.warn(
      'Liquibase completed successfully but did not generate a diff changelog. The reference and target schemas may already match, or liquibase-hibernate did not expose entity metadata.'
    );
    void vscode.window.showWarningMessage(
      'Liquibase completed but produced no diff changelog. The entity model and database may already match, or Hibernate metadata was not loaded.'
    );
    return;
  }

  const savedChangelog = saveGeneratedChangelog({
    workspaceRoot,
    changelogRoot,
    filename,
    content: generatedChangelog
  });
  logger.info(`Saved generated diff changelog: ${savedChangelog.relativePath}`);
  void vscode.window.showInformationMessage(`Generated changelog saved: ${savedChangelog.relativePath}`);
  await openSavedChangelog(savedChangelog.absolutePath, generatedChangelog);
}

function resolveConfigValue(value: string | boolean | number | null | undefined): string | undefined {
  return typeof value === 'string' ? resolveSpringPlaceholders(value) : undefined;
}

async function resolveSpringBootBasePackage(workspaceRoot: string, logger: Logger): Promise<string | undefined> {
  const candidates = detectSpringBootApplicationPackages(workspaceRoot);
  if (candidates.length === 1) {
    logger.info(`Auto-detected Spring Boot base package: ${candidates[0].packageName}`);
    return candidates[0].packageName;
  }

  if (candidates.length > 1) {
    const selected = await vscode.window.showQuickPick(
      candidates.map((candidate) => ({
        label: candidate.packageName,
        description: candidate.filePath,
        packageName: candidate.packageName
      })),
      {
        title: 'Spring Boot base package',
        placeHolder: 'Select the application package to use for entity scanning'
      }
    );
    if (selected) {
      logger.info(`Selected Spring Boot base package: ${selected.packageName}`);
      return selected.packageName;
    }
    return undefined;
  }

  return vscode.window.showInputBox({
    title: 'Spring Boot base package',
    prompt: 'Base package used for liquibase-hibernate reference URL, for example com.example.demo'
  });
}
