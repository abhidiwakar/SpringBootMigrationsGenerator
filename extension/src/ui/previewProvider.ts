import { existsSync } from 'node:fs';
import * as vscode from 'vscode';

let latestGeneratedContent: string | undefined;
let latestGeneratedFile: string | undefined;

export function setLatestGeneratedChangelog(content: string): void {
  latestGeneratedContent = content;
}

export async function openChangelogPreview(content: string, language = 'yaml'): Promise<void> {
  latestGeneratedContent = content;
  latestGeneratedFile = undefined;
  const document = await vscode.workspace.openTextDocument({ content, language });
  await vscode.window.showTextDocument(document, { preview: false });
}

export async function openSavedChangelog(absolutePath: string, content: string): Promise<void> {
  latestGeneratedContent = content;
  latestGeneratedFile = absolutePath;
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(absolutePath));
  await vscode.window.showTextDocument(document, { preview: false });
}

export async function previewLatestChangelog(): Promise<void> {
  if (latestGeneratedFile && existsSync(latestGeneratedFile)) {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(latestGeneratedFile));
    await vscode.window.showTextDocument(document, { preview: false });
    return;
  }
  if (!latestGeneratedContent) {
    void vscode.window.showInformationMessage('No generated changelog is available to preview yet.');
    return;
  }
  await openChangelogPreview(latestGeneratedContent);
}
