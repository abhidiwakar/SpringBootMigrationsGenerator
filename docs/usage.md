# Usage

Open a Spring Boot project in VS Code, then run `Spring Liquibase: Validate Setup`.

The validation command checks:

- Maven or Gradle build file.
- Spring Boot dependency.
- Liquibase dependency.
- JPA/Hibernate dependency.
- PostgreSQL driver dependency.
- Spring datasource configuration.
- Existing changelog root and master changelog.
- `ddl-auto=update` warnings.

Run `Spring Liquibase: Configure Liquibase` to create a YAML master changelog and store a default author setting.

Run `Spring Liquibase: Generate Initial Changelog` or `Spring Liquibase: Generate Diff Changelog From Entities` to execute Liquibase generation into a temporary changelog file and open the result in a preview editor. The MVP does not apply changes to the database.

Run `Spring Liquibase: Add Changelog To Master File` to add a YAML include to the master changelog.

## Recommended production Spring settings

```properties
spring.jpa.hibernate.ddl-auto=validate
spring.liquibase.enabled=true
```
