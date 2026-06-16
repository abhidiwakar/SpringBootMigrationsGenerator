import { openChangelogPreview } from '../ui/previewProvider';

export async function generateRollbackPreview(): Promise<void> {
  await openChangelogPreview(
    [
      '# Rollback Preview',
      '# Safe rollback examples:',
      '# - createTable -> dropTable',
      '# - addColumn -> dropColumn',
      '# - createIndex -> dropIndex',
      '# Manual review is required for destructive or data-loss-prone rollback.',
      '',
      'databaseChangeLog: []',
      ''
    ].join('\n')
  );
}
