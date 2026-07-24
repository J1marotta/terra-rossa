# Repository Agent Instructions

These instructions apply to the entire repository.

## Task completion workflow

After completing each user-requested task:

1. Verify the change with the most relevant available checks, tests, or build.
2. Review the diff and keep unrelated user changes out of the commit.
3. Commit the completed task with a concise, descriptive commit message.
4. Push the commit to the current upstream branch when repository access permits.
5. Deploy the result when a deployment workflow is already configured and the task produces deployable changes.
6. Verify the deployment when practical and report the commit, push, deployment URL, and verification result.

If committing, pushing, or deploying is not possible, do not invent credentials, infrastructure, or configuration. Preserve the completed local changes and clearly report what remains, why it could not be completed, and the exact next action needed.

Do not deploy documentation-only changes unless the repository's established workflow automatically includes them or the user specifically requests a deployment.
