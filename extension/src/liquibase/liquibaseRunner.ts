import { spawn } from 'node:child_process';
import type { LiquibaseCommand } from '../types';
import { redactSecrets } from '../services/safetyService';

export interface LiquibaseRunResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  command: string;
}

export function runLiquibase(command: LiquibaseCommand, cwd: string): Promise<LiquibaseRunResult> {
  return new Promise((resolve) => {
    const child = spawn(command.executable, command.args, {
      cwd,
      shell: false,
      env: process.env
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', (error) => {
      resolve({
        exitCode: null,
        stdout: '',
        stderr: redactSecrets(error.message, command.secrets),
        command: command.displayCommand
      });
    });
    child.on('close', (exitCode) => {
      resolve({
        exitCode,
        stdout: redactSecrets(Buffer.concat(stdout).toString('utf8'), command.secrets),
        stderr: redactSecrets(Buffer.concat(stderr).toString('utf8'), command.secrets),
        command: command.displayCommand
      });
    });
  });
}
