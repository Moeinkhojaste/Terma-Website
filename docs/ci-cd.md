# Terma CI/CD

The repository uses GitHub Actions to protect both independent applications.

## Checks on every push and pull request

`.github/workflows/ci-cd.yml` runs these jobs:

- **Frontend checks**: `npm ci`, ESLint, TypeScript type-check, and a production Next.js build.
- **Backend checks**: .NET 8 restore, Release build with warnings treated as errors, unit tests, integration tests, and test-result upload. The backend job uses `windows-latest` because the current integration tests use the Windows-managed `winsqlite3` provider.
- **Architecture and repository policy**: confirms that there is no shared root `src/`, both applications remain separate, and project references follow the Clean Architecture dependency direction.
- **Delivery summary**: succeeds only when all three checks pass.

The workflow cancels older runs for the same branch when a newer commit arrives. This avoids using stale results.

## Delivery artifacts

For pushes to `main` and version tags, successful builds upload short-lived artifacts:

- `frontend-next-build-<commit>`
- `backend-api-publish-<commit>`

These are build outputs ready for a deployment step. The repository does not currently specify a hosting target, production environment, domain, or deployment credentials, so the workflow does not deploy to an unknown service. After choosing a target such as Azure, Vercel, or another host, a protected environment and a final deployment job can consume these artifacts.

## GitHub branch protection setup

In **Settings → Branches → Branch protection rules** for `main`:

1. Require a pull request before merging.
2. Require approvals as appropriate for the team.
3. Require status checks to pass before merging:
   - `Frontend checks`
   - `Backend checks`
   - `Architecture and repository policy`
   - `Delivery summary`
4. Require branches to be up to date before merging.
5. Block force pushes and branch deletion.

The `dependency-review.yml` workflow also rejects pull requests that introduce a dependency vulnerability rated high or critical by GitHub's dependency review service.
