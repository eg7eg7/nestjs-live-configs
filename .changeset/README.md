# Changesets

Create a changeset for user-facing changes with:

```bash
npm run changeset
```

The release workflow runs on pushes to `main` and uses Changesets to either:

- open or update the release PR when unpublished changesets exist
- publish a new npm release when versioned release commits land on `main`
