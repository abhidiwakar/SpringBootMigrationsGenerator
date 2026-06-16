import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import * as vscode from 'vscode';
import { createEmptyMasterChangelog } from '../services/changelogService';
import { Logger } from '../utils/logger';

export async function configureLiquibase(workspaceRoot: string, logger: Logger): Promise<void> {
  const config = vscode.workspace.getConfiguration('springLiquibaseGenerator');
  const defaultMaster = config.get<string>('masterChangelog') ?? 'src/main/resources/db/changelog/db.changelog-master.yaml';
  const masterPath = join(workspaceRoot, defaultMaster);

  if (!existsSync(masterPath)) {
    const answer = await vscode.window.showWarningMessage(
      `Master changelog does not exist at ${defaultMaster}. Create it?`,
      'Create',
      'Cancel'
    );
    if (answer === 'Create') {
      mkdirSync(dirname(masterPath), { recursive: true });
      writeFileSync(masterPath, createEmptyMasterChangelog(), 'utf8');
      logger.info(`Created master changelog: ${defaultMaster}`);
    }
  }

  const author = await vscode.window.showInputBox({
    title: 'Default Liquibase author',
    prompt: 'Author name for generated changesets',
    value: config.get<string>('defaultAuthor') ?? ''
  });
  if (author !== undefined) {
    await config.update('defaultAuthor', author, vscode.ConfigurationTarget.Workspace);
    logger.info('Updated default Liquibase author setting.');
  }

  void vscode.window.showInformationMessage('Spring Liquibase configuration complete.');
}
