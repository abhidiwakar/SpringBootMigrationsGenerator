# Limitations

- PostgreSQL is the only supported database target in the MVP.
- YAML changelog mutation is supported first.
- XML, JSON, and formatted SQL master changelog mutation are deferred.
- Entity diff generation requires `liquibase-hibernate` and a working project classpath.
- `liquibase-hibernate6` targets Hibernate 6. Spring Boot 4 / Hibernate 7 projects need a compatible Liquibase Hibernate extension before entity diff generation can work.
- Complex Hibernate mappings may need manual configuration.
- Multi-module builds may need additional classpath support.
- Renames and destructive changes require manual review.
- The extension does not run `liquibase update` or mutate the database.

The implementation intentionally avoids fake changelog generation. When prerequisites are missing, the extension reports what needs to be configured.
