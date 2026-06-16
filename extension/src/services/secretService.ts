import * as vscode from 'vscode';

export class SecretService {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  async resolvePlaceholder(name: string): Promise<string | undefined> {
    const envValue = process.env[name];
    if (envValue) {
      return envValue;
    }

    const stored = await this.secrets.get(name);
    if (stored) {
      return stored;
    }

    const entered = await vscode.window.showInputBox({
      title: `Enter value for ${name}`,
      prompt: `Value for Spring placeholder \${${name}}`,
      password: name.toLowerCase().includes('password')
    });

    if (entered) {
      await this.secrets.store(name, entered);
    }
    return entered;
  }
}
