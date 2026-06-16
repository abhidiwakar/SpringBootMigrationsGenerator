# Java Helper

This folder is reserved for a future helper process that can load Spring Boot and Hibernate metadata more reliably than direct command-line `liquibase-hibernate` setup in complex projects.

The MVP does not include a compiled helper. It keeps the integration boundary explicit and avoids parsing Java entity source files.

Expected future responsibilities:

- Start the Spring Boot application with `spring.main.web-application-type=none`.
- Use a dedicated `liquibase-generator` profile.
- Load Hibernate metadata and naming strategies.
- Produce a normalized schema snapshot or Liquibase-compatible reference configuration.
- Never start the web server or mutate the database.
