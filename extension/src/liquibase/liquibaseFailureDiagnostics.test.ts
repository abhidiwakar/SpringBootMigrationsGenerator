import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { explainLiquibaseFailure } from './liquibaseFailureDiagnostics';

describe('explainLiquibaseFailure', () => {
  it('explains Java class file version mismatches', () => {
    const message = explainLiquibaseFailure(
      'UnsupportedClassVersionError: BaseEntity has been compiled by a more recent version of the Java Runtime (class file version 65.0), this version of the Java Runtime only recognizes class file versions up to 61.0'
    );

    assert.match(message ?? '', /Java 17/);
    assert.match(message ?? '', /Java 21/);
    assert.match(message ?? '', /springLiquibaseGenerator\.javaCommand/);
  });

  it('explains generic Hibernate class loading failures', () => {
    const message = explainLiquibaseFailure('ClassLoadingException: Unable to load class [com.example.BaseEntity]');

    assert.equal(
      message,
      'Liquibase Hibernate could not load com.example.BaseEntity. Run a clean project build and verify the runtime classpath includes compiled main classes.'
    );
  });

  it('explains liquibase-hibernate6 incompatibility with Hibernate 7', () => {
    const message = explainLiquibaseFailure(
      [
        "NoSuchMethodError: 'org.hibernate.id.factory.IdentifierGeneratorFactory org.hibernate.boot.spi.MetadataBuildingOptions.getIdentifierGeneratorFactory()'",
        'Hibernate ORM core version 7.4.1.Final'
      ].join('\n')
    );

    assert.match(message ?? '', /liquibase-hibernate6 is incompatible/);
    assert.match(message ?? '', /Hibernate ORM 7\.4\.1\.Final/);
    assert.match(message ?? '', /Liquibase 5 with liquibase-hibernate7/);
  });
});
