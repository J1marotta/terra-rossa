# Terra Rossa

Terra Rossa is a browser-first, continuous PvPvE survival shooter for two to four players. The active product and technical requirements live in [`spec.md`](spec.md), and the dependency-ordered implementation plan lives in [`TODO.md`](TODO.md).

## Repository audit

Audited for task T0.1 on 28 July 2026.

### Authoritative locations

- Git root and intended application root: `C:\Users\James\Documents\Code\terra-rossa`.
- The web workspace will be scaffolded directly beneath this root. It must not be created inside the nested `terra-rossa` directory.
- `C:\Users\James\Documents\Code\deathRace` is read-only reference material for architecture and deployment lessons. Terra Rossa must not import, modify, or copy its source code.
- The `origin` remote is `git@github.com:J1marotta/terra-rossa.git`.

### Existing file ownership

| Path | Kind | Decision |
| --- | --- | --- |
| `AGENTS.md`, `spec.md`, `TODO.md`, `why.html` | Tracked project documentation | Maintain as the active instructions, specification, roadmap, and decision journal. |
| `TODOS.md`, `solo-spec.md` | Tracked historical documentation | Preserve for context; do not implement unless explicitly restored. |
| `.editorconfig`, `.gitattributes`, `.gitignore` | Untracked repository configuration from the Godot starter | Leave untouched until the web workspace task deliberately reconciles and tracks repository configuration. |
| `project.godot`, `node_2d.tscn`, `icon.svg` | Untracked Godot source assets | Retain temporarily and do not overwrite, move, or delete. They are not part of the active web build. |
| `icon.svg.import` | Untracked Godot-generated import metadata | Leave untouched with the starter; do not treat it as web source. |
| `.godot/` | Ignored Godot editor and import cache | Generated output. Keep ignored and never commit it. |
| `terra-rossa/.codex-remote-attachments/` | Untracked conversation attachments | User-owned inputs. Do not use as the application root or commit without an explicit asset decision. |

Tracked files are the current repository source of truth. Untracked files listed above remain user-owned even when a later task creates adjacent web files.

### Migration boundary

The browser implementation will be added alongside the retained Godot starter, using clearly named client, server, shared, test, and public-asset locations. Each scaffolding task must inspect Git status first, add only the files it intentionally creates, and avoid broad staging commands. Generated dependency folders, build output, coverage, logs, local environment files, and Godot caches must be ignored; source, tests, manifests, lockfiles, examples, and documentation should be tracked.

No migration task may delete the Godot starter or nested attachments. Removing or archiving them requires a separate user-approved decision after the web version is established.
