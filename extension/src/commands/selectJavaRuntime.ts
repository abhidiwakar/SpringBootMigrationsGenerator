import * as vscode from 'vscode';
import {
  detectProjectJavaVersion,
  discoverInstalledJavaRuntimes,
  selectJavaRuntime
} from '../services/javaRuntimeService';
import { Logger } from '../utils/logger';

export async function resolveJavaCommand(workspaceRoot: string, logger: Logger): Promise<string> {
  const config = vscode.workspace.getConfiguration('springLiquibaseGenerator');
  const configured = config.get<string>('javaCommand');
  const targetVersion = detectProjectJavaVersion(workspaceRoot);
  const runtimes = await discoverInstalledJavaRuntimes();
  const selected = selectJavaRuntime(targetVersion, runtimes);

  if (selected) {
    logger.info(
      `Using Java ${selected.majorVersion} for Liquibase${targetVersion ? ` based on project target Java ${targetVersion}` : ''}: ${selected.javaCommand}`
    );
    return selected.javaCommand;
  }

  logger.warn(`No installed Java runtime was auto-detected. Falling back to configured javaCommand: ${configured || 'java'}`);
  return configured && configured.trim().length > 0 ? configured : 'java';
}

export async function selectJavaRuntimeCommand(workspaceRoot: string, logger: Logger): Promise<void> {
  const config = vscode.workspace.getConfiguration('springLiquibaseGenerator');
  const targetVersion = detectProjectJavaVersion(workspaceRoot);
  const runtimes = await discoverInstalledJavaRuntimes();
  const suggested = selectJavaRuntime(targetVersion, runtimes);

  if (runtimes.length === 0) {
    void vscode.window.showWarningMessage('No installed Java runtimes were detected. Set springLiquibaseGenerator.javaCommand manually.');
    return;
  }

  const picked = await vscode.window.showQuickPick(
    runtimes.map((runtime) => ({
      label: runtime.label,
      description: runtime.javaCommand,
      detail:
        suggested?.javaCommand === runtime.javaCommand
          ? `Recommended${targetVersion ? ` for project Java ${targetVersion}` : ''}`
          : undefined,
      runtime
    })),
    {
      title: 'Select Java runtime for Spring Liquibase Generator',
      placeHolder: targetVersion ? `Project target appears to be Java ${targetVersion}` : 'Choose a Java runtime'
    }
  );

  if (!picked) {
    return;
  }

  await config.update('javaCommand', picked.runtime.javaCommand, vscode.ConfigurationTarget.Workspace);
  logger.info(`Selected Java runtime: ${picked.runtime.javaCommand}`);
  void vscode.window.showInformationMessage(`Spring Liquibase will use Java ${picked.runtime.majorVersion}.`);
}
