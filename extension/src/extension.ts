import * as vscode from 'vscode';
import { addChangelogToMaster } from './commands/addChangelogToMaster';
import { configureLiquibase } from './commands/configureLiquibase';
import { generateDiffChangelog } from './commands/generateDiffChangelog';
import { generateInitialChangelog } from './commands/generateInitialChangelog';
import { generateRollbackPreview } from './commands/generateRollbackPreview';
import { previewChangelog } from './commands/previewChangelog';
import { selectJavaRuntimeCommand } from './commands/selectJavaRuntime';
import { validateSetup } from './commands/validateSetup';
import { SidebarProvider } from './ui/sidebarProvider';
import { Logger } from './utils/logger';

export function activate(context: vscode.ExtensionContext): void {
  const logger = new Logger();
  const sidebar = new SidebarProvider();
  context.subscriptions.push(logger);
  context.subscriptions.push(vscode.window.registerTreeDataProvider('springLiquibaseGenerator.sidebar', sidebar));

  context.subscriptions.push(
    vscode.commands.registerCommand('springLiquibaseGenerator.validateSetup', async () => {
      const root = getWorkspaceRoot();
      if (!root) {
        return;
      }
      const report = await validateSetup(root, logger);
      sidebar.refresh(report);
    }),
    vscode.commands.registerCommand('springLiquibaseGenerator.configureLiquibase', async () => {
      const root = getWorkspaceRoot();
      if (root) {
        await configureLiquibase(root, logger);
      }
    }),
    vscode.commands.registerCommand('springLiquibaseGenerator.generateInitialChangelog', async () => {
      const root = getWorkspaceRoot();
      if (root) {
        await generateInitialChangelog(root, logger);
      }
    }),
    vscode.commands.registerCommand('springLiquibaseGenerator.generateDiffChangelog', async () => {
      const root = getWorkspaceRoot();
      if (root) {
        await generateDiffChangelog(root, logger, context.globalStorageUri.fsPath);
      }
    }),
    vscode.commands.registerCommand('springLiquibaseGenerator.previewChangelog', previewChangelog),
    vscode.commands.registerCommand('springLiquibaseGenerator.addChangelogToMaster', async () => {
      const root = getWorkspaceRoot();
      if (root) {
        await addChangelogToMaster(root, logger);
      }
    }),
    vscode.commands.registerCommand('springLiquibaseGenerator.generateRollbackPreview', generateRollbackPreview),
    vscode.commands.registerCommand('springLiquibaseGenerator.selectJavaRuntime', async () => {
      const root = getWorkspaceRoot();
      if (root) {
        await selectJavaRuntimeCommand(root, logger);
      }
    })
  );
}

export function deactivate(): void {
  // VS Code disposes subscriptions registered in activate.
}

function getWorkspaceRoot(): string | undefined {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) {
    void vscode.window.showErrorMessage('Open a Spring Boot workspace before using Spring Liquibase Changelog Generator.');
    return undefined;
  }
  return root;
}
