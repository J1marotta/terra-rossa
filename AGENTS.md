# Repository Agent Instructions

These instructions apply to the entire repository.

## Task completion workflow

After completing each user-requested task:

1. Update `why.html` for every task and every commit with the decisions, evidence, implementation lesson, or status change produced by the work. Keep it useful to a junior developer learning how and why the game is being built.
2. Keep `why.html` engaging and easy to explore. It is a standalone HTML page and may use embedded CSS and JavaScript without adding a build dependency.
3. When implementing from `TODO.md`, update the selected task status and satisfy its prerequisites, acceptance criteria, and exclusions.
4. Verify the change with the most relevant available checks, tests, or build.
5. Review the diff and keep unrelated user changes out of the commit.
6. Commit the completed task, including the corresponding `why.html` and `TODO.md` updates, with a concise, descriptive commit message.
7. Push the commit to the current upstream branch when repository access permits.
8. Deploy every deployable code change after a deployment workflow is configured.
9. Verify the deployment when practical and report the commit, push, deployment URL, and verification result.

If committing, pushing, or deploying is not possible, do not invent credentials, infrastructure, or configuration. Preserve the completed local changes and clearly report what remains, why it could not be completed, and the exact next action needed.

Do not deploy documentation-only changes unless the repository's established workflow automatically includes them or the user specifically requests a deployment. Never make a commit without updating `why.html`; when the commit implements an active task, update `TODO.md` in the same commit.
