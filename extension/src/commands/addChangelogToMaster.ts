import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as vscode from 'vscode';
import { addYamlInclude } from '../services/changelogService';
import { Logger } from '../utils/logger';

export async function addChangelogToMaster(workspaceRoot: string, logger: Logger): Promise<void> {
  const settings = vscode.workspace.getConfiguration('springLiquibaseGenerator');
  const master = settings.get<string>('masterChangelog') ?? 'src/main/resources/db/changelog/db.changelog-master.yaml';
  const masterPath = join(workspaceRoot, master);
  if (!existsSync(masterPath)) {
    void vscode.window.showErrorMessage(`Master changelog not found: ${master}`);
    return;
  }

  const includeFile = await vscode.window.showInputBox({
    title: 'Changelog include path',
    prompt: 'Path to include, for example db/changelog/changes/002-users.yaml'
  });
  if (!includeFile) {
    return;
  }

  const updated = addYamlInclude(readFileSync(masterPath, 'utf8'), includeFile);
  writeFileSync(masterPath, updated, 'utf8');
  logger.info(`Added changelog include to master: ${includeFile}`);
  void vscode.window.showInformationMessage('Changelog include added to master changelog.');
}
