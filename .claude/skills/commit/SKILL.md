---
name: commit
description: Review git changes, get user approval, then commit and push
---

# Commit and Push Workflow

This skill automates the workflow of reviewing changes, getting user approval, and committing with a push.

## Steps

1. **Check current git status** — List all modified and untracked files
2. **Show diff summary** — Display what's actually changing (concisely, grouped by feature/concern)
3. **Ask user for confirmation** — Present the changes and ask for:
   - Approval to proceed
   - Commit message (with intelligent suggestion based on the changes)
4. **Execute commit and push** — If approved:
   - Stage all files
   - Create commit with the provided message (include Co-Authored-By)
   - Push to origin
5. **Report result** — Show commit hash and push confirmation

## When to use

- After completing a feature/bugfix and ready to commit
- Type `/commit` when you've made changes you want to save
- Faster than manual git add/commit/push workflow
- Ensures you review what's being committed before it happens
