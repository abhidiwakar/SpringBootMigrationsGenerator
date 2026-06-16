import * as vscode from 'vscode';
import { redactSecrets } from '../services/safetyService';

export class Logger {
  private readonly channel: vscode.OutputChannel;
  private secrets: string[] = [];

  constructor(channelName = 'Spring Liquibase Changelog Generator') {
    this.channel = vscode.window.createOutputChannel(channelName);
  }

  setSecrets(secrets: string[]): void {
    this.secrets = secrets.filter((secret) => secret.length > 0);
  }

  info(message: string): void {
    this.channel.appendLine(`[info] ${redactSecrets(message, this.secrets)}`);
  }

  warn(message: string): void {
    this.channel.appendLine(`[warn] ${redactSecrets(message, this.secrets)}`);
  }

  error(message: string): void {
    this.channel.appendLine(`[error] ${redactSecrets(message, this.secrets)}`);
  }

  show(): void {
    this.channel.show();
  }

  dispose(): void {
    this.channel.dispose();
  }
}
