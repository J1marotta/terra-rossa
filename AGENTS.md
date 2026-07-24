# Repository Agent Instructions

These instructions apply to the entire repository.

## Task completion workflow

After completing each user-requested task:

1. Update `why.html` with the decisions made during the task and the reasoning behind them. Keep it useful to a junior developer learning how and why the game is being built.
2. Keep `why.html` engaging and easy to explore. It is a standalone HTML page and may use embedded CSS and JavaScript without adding a build dependency.
3. Verify the change with the most relevant available checks, tests, or build.
4. Review the diff and keep unrelated user changes out of the commit.
5. Commit the completed task, including the corresponding `why.html` update, with a concise, descriptive commit message.
6. Push the commit to the current upstream branch when repository access permits.
7. Deploy the result when a deployment workflow is already configured and the task produces deployable changes.
8. Verify the deployment when practical and report the commit, push, deployment URL, and verification result.

If committing, pushing, or deploying is not possible, do not invent credentials, infrastructure, or configuration. Preserve the completed local changes and clearly report what remains, why it could not be completed, and the exact next action needed.

Do not deploy documentation-only changes unless the repository's established workflow automatically includes them or the user specifically requests a deployment. Never make a commit that changes project files without also reviewing and, when the decision history changed, updating `why.html`.
