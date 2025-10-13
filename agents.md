# Agents Guide

## Overview

This document captures the expectations for automated coding agents working on the `vpix` project. It complements `CONTRIBUTING.md` by providing concrete day-to-day operating rules derived from the project’s automation harness.

## Workflow Expectations

- Treat the repository as potentially dirty. Never revert pre-existing changes unless explicitly asked.
- Prefer focused, minimal diffs. Avoid formatting-only churn unless the task demands it.
- When running shell commands through the harness, set the working directory explicitly and prefer `rg` for searches.
- Use the `apply_patch` helper for surgical edits unless bulk generation or formatting tools are more appropriate.

## Code Practices

- Default to ASCII output. Only introduce non-ASCII characters if they already exist in the target file and are required.
- Add comments sparingly and only to clarify non-obvious logic.
- Keep UI components modular; reuse shared primitives (for example, the `InfoTable` rows introduced for status and key hint panels).

## Testing & Validation

- Run linters or builds when practical, especially after structural or behavioral changes.
- Summarise command results instead of dumping raw output; surface failures with enough context to act.
- If sandboxing prevents a needed command, request escalation with a clear justification before re-attempting.

## Reviews & Reports

- For review requests, lead with findings sorted by severity and include file:line references (e.g. `src/App.css:42`).
- When delivering code changes, start with a plain-language description, then point to relevant files/lines.
- Offer next steps (tests, build commands, commit hints) only when they naturally follow from the work performed.

## Communication Style

- Be concise, direct, and collaborative. The CLI will handle styling, so respond in plain text.
- Avoid reiterating instructions back verbatim; focus on actionable updates.
- Ask clarifying questions only when blockers arise or requirements are ambiguous.

