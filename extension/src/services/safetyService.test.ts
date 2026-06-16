import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifyChange, redactSecrets } from './safetyService';

describe('safetyService', () => {
  it('classifies destructive Liquibase changes as dangerous', () => {
    assert.equal(classifyChange('dropTable'), 'dangerous');
    assert.equal(classifyChange('modifyDataType'), 'dangerous');
    assert.equal(classifyChange('createTable'), 'safe');
  });

  it('redacts configured secrets from log output', () => {
    const redacted = redactSecrets('url jdbc password=s3cr3t username=app', ['s3cr3t']);
    assert.equal(redacted, 'url jdbc password=*** username=app');
  });
});
