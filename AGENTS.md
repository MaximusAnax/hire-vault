# AGENTS.md

## Cursor Cloud specific instructions

This is a greenfield repository (`hire-vault`) — as of initial setup, no application code, dependencies, or services exist yet.

### Environment

- **Node.js**: v22 (via nvm)
- **npm**: v10, **pnpm**: v10 also available
- **Python**: 3.12
- **Git**: 2.43

### When code is added

Once application code and a package manifest (e.g. `package.json`, `requirements.txt`) are committed, the update script and this section should be revised to include:
- Dependency installation commands
- How to lint, test, build, and run the application
- Any external service requirements (databases, APIs, etc.)
