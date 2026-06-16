import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  composeHibernate7LiquibaseClasspath,
  detectHibernateMajorFromClasspath,
  hasLiquibaseHibernate7,
  resolveHibernateAwareLiquibaseClasspath
} from './liquibaseToolingResolver';

describe('liquibaseToolingResolver', () => {
  it('detects Hibernate 7 from a resolved runtime classpath', () => {
    const major = detectHibernateMajorFromClasspath([
      '/repo/build/classes/java/main',
      '/home/user/.gradle/caches/modules-2/files-2.1/org.hibernate.orm/hibernate-core/7.4.1.Final/hibernate-core-7.4.1.Final.jar'
    ]);

    assert.equal(major, 7);
  });

  it('detects liquibase-hibernate7 in a resolved runtime classpath', () => {
    assert.equal(
      hasLiquibaseHibernate7(['/tools/liquibase-hibernate7-5.0.3.jar']),
      true
    );
  });

  it('prepends Hibernate 7 Liquibase jars and removes incompatible Liquibase extension jars', () => {
    const classpath = composeHibernate7LiquibaseClasspath({
      baseClasspath: [
        '/app/build/classes/java/main',
        '/home/user/.m2/repository/org/liquibase/liquibase-core/4.32.0/liquibase-core-4.32.0.jar',
        '/home/user/.m2/repository/org/liquibase/ext/liquibase-hibernate6/4.32.0/liquibase-hibernate6-4.32.0.jar',
        '/home/user/.m2/repository/org.hibernate.orm/hibernate-core/7.4.1.Final/hibernate-core-7.4.1.Final.jar'
      ],
      liquibaseCoreJar: '/tools/liquibase-core-5.0.3.jar',
      liquibaseHibernateJar: '/tools/liquibase-hibernate7-5.0.3.jar'
    });

    assert.deepEqual(classpath.slice(0, 2), [
      '/tools/liquibase-core-5.0.3.jar',
      '/tools/liquibase-hibernate7-5.0.3.jar'
    ]);
    assert.equal(classpath.some((entry) => entry.includes('liquibase-hibernate6')), false);
    assert.equal(classpath.some((entry) => entry.includes('liquibase-core-4.32.0')), false);
    assert.ok(classpath.includes('/app/build/classes/java/main'));
    assert.ok(classpath.includes('/home/user/.m2/repository/org.hibernate.orm/hibernate-core/7.4.1.Final/hibernate-core-7.4.1.Final.jar'));
  });

  it('logs when replacing liquibase-hibernate6 from a Hibernate 7 project classpath', async () => {
    const messages: string[] = [];

    const classpath = await resolveHibernateAwareLiquibaseClasspath(
      [
        '/app/build/classes/java/main',
        '/Users/abhishek/.gradle/caches/modules-2/files-2.1/org.liquibase.ext/liquibase-hibernate6/5.0.3/hash/liquibase-hibernate6-5.0.3.jar',
        '/Users/abhishek/.gradle/caches/modules-2/files-2.1/org.liquibase/liquibase-core/5.0.3/hash/liquibase-core-5.0.3.jar',
        '/Users/abhishek/.gradle/caches/modules-2/files-2.1/org.hibernate.orm/hibernate-core/7.4.1.Final/hash/hibernate-core-7.4.1.Final.jar'
      ],
      {
        toolsDirectory: '/unused',
        liquibaseCoreJarPath: '/tools/liquibase-core-5.0.3.jar',
        liquibaseHibernateJarPath: '/tools/liquibase-hibernate7-5.0.3.jar',
        allowDownloads: false,
        logger: {
          info(message) {
            messages.push(message);
          }
        }
      }
    );

    assert.equal(classpath.some((entry) => entry.includes('liquibase-hibernate6')), false);
    assert.match(messages.join('\n'), /Replacing incompatible Liquibase Hibernate jars: liquibase-hibernate6-5\.0\.3\.jar/);
  });
});
