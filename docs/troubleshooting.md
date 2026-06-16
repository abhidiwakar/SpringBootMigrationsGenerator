# Troubleshooting

## Liquibase dependency missing

Add one of:

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-liquibase</artifactId>
</dependency>
```

or:

```kotlin
implementation("org.liquibase:liquibase-core")
```

## JPA or Hibernate dependency missing

Add `spring-boot-starter-data-jpa` or `hibernate-core`.

## PostgreSQL driver missing

Add `org.postgresql:postgresql`.

## Entity diff generation is blocked

Add the matching Liquibase Hibernate extension, usually `org.liquibase.ext:liquibase-hibernate6` for Spring Boot 3 and Hibernate 6.

You also need a base package such as `com.example.demo` so the extension can prepare a reference URL:

```text
hibernate:spring:com.example.demo?dialect=org.hibernate.dialect.PostgreSQLDialect
```

## Passwords in logs

The extension redacts configured secrets before writing logs. Do not put resolved passwords into changelog files or committed `liquibase.properties` files.
