import { escapeRegExp } from '../utils/sanitizers';

export type ChangeSafety = 'safe' | 'dangerous' | 'review';

const DANGEROUS_CHANGES = new Set([
  'droptable',
  'dropcolumn',
  'renametable',
  'renamecolumn',
  'modifydatatype',
  'dropindex',
  'dropuniqueconstraint',
  'dropforeignkeyconstraint',
  'dropprimarykey',
  'addnotnullconstraint'
]);

const SAFE_CHANGES = new Set([
  'createtable',
  'addcolumn',
  'addprimarykey',
  'addforeignkeyconstraint',
  'createindex',
  'adduniqueconstraint',
  'adddefaultvalue'
]);

export function classifyChange(changeType: string): ChangeSafety {
  const normalized = changeType.replace(/[^a-zA-Z]/g, '').toLowerCase();
  if (DANGEROUS_CHANGES.has(normalized)) {
    return 'dangerous';
  }
  if (SAFE_CHANGES.has(normalized)) {
    return 'safe';
  }
  return 'review';
}

export function redactSecrets(value: string, secrets: string[]): string {
  return secrets
    .filter((secret) => secret.length > 0)
    .reduce((current, secret) => current.replace(new RegExp(escapeRegExp(secret), 'g'), '***'), value);
}
