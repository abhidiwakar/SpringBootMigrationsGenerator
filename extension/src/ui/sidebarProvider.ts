import * as vscode from 'vscode';
import type { ValidationReport } from '../types';

export class SidebarProvider implements vscode.TreeDataProvider<SidebarItem> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<SidebarItem | undefined>();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;
  private report?: ValidationReport;

  refresh(report?: ValidationReport): void {
    this.report = report;
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  getTreeItem(element: SidebarItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SidebarItem): SidebarItem[] {
    if (element) {
      return element.children;
    }

    if (!this.report) {
      return [
        new SidebarItem('Project', [new SidebarItem('Run Validate Setup')]),
        new SidebarItem('Actions', [
          commandItem('Validate Setup', 'springLiquibaseGenerator.validateSetup'),
          commandItem('Generate Diff Changelog', 'springLiquibaseGenerator.generateDiffChangelog')
        ])
      ];
    }

    const { detection, config } = this.report;
    return [
      new SidebarItem('Project', [
        new SidebarItem(`Spring Boot: ${detection.isSpringBoot ? 'yes' : 'no'}`),
        new SidebarItem(`Build tool: ${detection.buildTool}`)
      ]),
      new SidebarItem('Liquibase', [
        new SidebarItem(`Dependency: ${detection.liquibase.found ? 'found' : 'missing'}`),
        new SidebarItem(`Master changelog: ${detection.masterChangelog ? 'found' : 'missing'}`)
      ]),
      new SidebarItem('Database', [
        new SidebarItem(`Datasource: ${typeof config.values['spring.datasource.url'] === 'string' ? 'configured' : 'missing'}`),
        new SidebarItem('Type: PostgreSQL')
      ]),
      new SidebarItem('Actions', [
        commandItem('Validate Setup', 'springLiquibaseGenerator.validateSetup'),
        commandItem('Generate Initial Changelog', 'springLiquibaseGenerator.generateInitialChangelog'),
        commandItem('Generate Diff Changelog', 'springLiquibaseGenerator.generateDiffChangelog'),
        commandItem('Preview Changelog', 'springLiquibaseGenerator.previewChangelog'),
        commandItem('Select Java Runtime', 'springLiquibaseGenerator.selectJavaRuntime')
      ])
    ];
  }
}

export class SidebarItem extends vscode.TreeItem {
  constructor(
    label: string,
    public readonly children: SidebarItem[] = []
  ) {
    super(label, children.length > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
  }
}

function commandItem(label: string, command: string): SidebarItem {
  const item = new SidebarItem(label);
  item.command = { command, title: label };
  return item;
}
