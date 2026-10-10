# CI/CD

- `.github/workflows/ci.yml` — lint, typecheck, build, 358 unit tests, 8 e2e
  tests. Runs on every push and PR; no deploy.
- The e2e job boots the real `AppModule`, so it needs Postgres and Redis as
  service containers. It sets every var the Joi schema requires, because a
  missing key fails the boot rather than the assertion.
- Firebase's key is **generated in a step**, not committed. `cert()` parses the
  PEM during `onModuleInit`, so `"dummy"` would crash the suite before any
  assertion ran.