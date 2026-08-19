# AGENTS.md

## What this repo is

A **knowledge base for Framer Code Components and Code Overrides** — not a runnable application. There is no `package.json`, no build/test/lint/typecheck, and no deployable code. Do not look for or invent those commands.

## How to work here

- For any task involving Framer code (components, overrides, property controls, Framer Motion, hydration, CMS, HLS, WebGL, fiber handlers), **load the `framer-code-components-overrides` skill first** (via the `skill` tool). The skill at `.agents/skills/framer-code-components-overrides/SKILL.md` is the canonical, up-to-date reference — its pitfalls table and patterns cover the non-obvious traps.
- Do not duplicate the skill's content into code or prose when the skill already answers it. Cite it instead.

## Repo layout

- `.agents/skills/framer-code-components-overrides/SKILL.md` — the skill; see its `references/` subfolder for cms, hls-video, patterns, fiber-handlers, webgl-shaders, property-controls.
- `docs/Framer University - Code Development Prompt.md` — the original long-form source prompt the skill was distilled from. Prefer the skill over this doc; if they conflict, the **skill wins** (it is the curated, executable reference).
- `skills-lock.json` — pins the skill source (`fredm00n/framerlabs` on GitHub). Update via the skill installer, not by hand.

## Conventions specific to this repo

- No git commits exist on `main` yet; there is no branch/PR/release flow to follow.
- When generating Framer code, follow the skill's required annotations (`@framerDisableUnlink`, `@framerIntrinsicWidth/Height`), the `withX` override naming, the `tok()` color-token unwrap, the two-phase hydration pattern, and literal (non-factory) override exports. These are the failure modes an agent would otherwise miss.