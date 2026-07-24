---
name: nest-js
description: Expert NestJS, Prisma, PostgreSQL, authentication and API architecture.
license: MIT
compatibility: opencode
---

# NestJS Expert

## Stack

- NestJS
- Prisma
- PostgreSQL
- Redis
- JWT
- Zod
- Pino
- Swagger

## General Rules

Always follow NestJS best practices.

Never use `any`.

Keep controllers thin.

Business logic belongs inside services.

## Controllers

Controllers should

- validate DTOs
- call services
- return responses

Do not write business logic.

## Services

Services should

- contain business logic
- use transactions when required
- throw NestJS exceptions

## Prisma

Prefer

select

instead of include

unless relations are required.

Avoid N+1 queries.

Use transactions for

- fees
- attendance
- marks
- report cards

## DTOs

Every endpoint must have

- request DTO
- response DTO when needed

Always validate input.

## Authentication

Use

- JwtAuthGuard
- RolesGuard
- decorators

Never trust client data.

## Database

Never

- hardcode IDs
- duplicate queries
- bypass Prisma

Always use indexes where necessary.

## API Design

REST conventions

GET

POST

PATCH

DELETE

Use pagination.

Return

{
  data,
  page,
  pageSize,
  total,
  totalPages
}

## Logging

Use Logger

Never console.log

## Errors

Throw

BadRequestException

NotFoundException

ForbiddenException

UnauthorizedException

ConflictException

## Code Quality

Prefer

small functions

early returns

descriptive names

dependency injection

Avoid

deep nesting

duplicate code

magic numbers
