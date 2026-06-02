# Contributing

`main` is protected. Every change lands through a pull request, and the
**Typecheck & test** check (`.github/workflows/ci.yml`) must pass before a PR can
be merged. Direct pushes to `main` are rejected — admins included.

## Workflow

```bash
git checkout -b my-change
# ...make changes, commit...
git push -u origin my-change
gh pr create --fill              # CI runs on the PR
# once the "Typecheck & test" check is green:
gh pr merge --squash --delete-branch
```

## Run the gates locally

Before pushing, run the same checks CI runs:

```bash
npm run typecheck
npm test
```
