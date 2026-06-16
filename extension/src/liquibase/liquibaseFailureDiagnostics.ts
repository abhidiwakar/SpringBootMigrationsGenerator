export function explainLiquibaseFailure(output: string): string | undefined {
  if (
    output.includes('NoSuchMethodError') &&
    output.includes('MetadataBuildingOptions.getIdentifierGeneratorFactory')
  ) {
    const hibernateVersion = output.match(/Hibernate ORM core version ([^\s]+)/)?.[1];
    return [
      `liquibase-hibernate6 is incompatible with${hibernateVersion ? ` Hibernate ORM ${hibernateVersion}` : ' this Hibernate ORM version'}.`,
      'This usually means the project is on Spring Boot 4 / Hibernate 7 while the Liquibase Hibernate extension on the classpath targets Hibernate 6.',
      'Update this extension and rerun entity diff generation so it can use Liquibase 5 with liquibase-hibernate7, or configure springLiquibaseGenerator.liquibaseHibernate7JarPath manually.'
    ].join(' ');
  }

  const classVersion = output.match(/class file version (\d+)\.0.*?recognizes class file versions up to (\d+)\.0/s);
  if (classVersion) {
    const requiredJava = classFileMajorToJava(Number.parseInt(classVersion[1], 10));
    const runningJava = classFileMajorToJava(Number.parseInt(classVersion[2], 10));
    return [
      `Liquibase is running with Java ${runningJava}, but the project classes require Java ${requiredJava}.`,
      'Set springLiquibaseGenerator.javaCommand to a Java executable that matches the project, for example /path/to/jdk-21/bin/java, then rerun generation.'
    ].join(' ');
  }

  const missingClass = output.match(/Unable to load class \[([^\]]+)]/);
  if (missingClass) {
    return `Liquibase Hibernate could not load ${missingClass[1]}. Run a clean project build and verify the runtime classpath includes compiled main classes.`;
  }

  return undefined;
}

function classFileMajorToJava(major: number): number {
  if (major >= 49) {
    return major - 44;
  }
  return major;
}
