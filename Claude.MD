# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
<!--
  Place this file at ./CLAUDE.md or ./.claude/CLAUDE.md in the theme repo — Claude Code
  loads it automatically every session. Keep it under ~200 lines: longer CLAUDE.md files
  measurably reduce instruction adherence. If this needs to grow, split the deep tool-by-tool
  reference into a skill (loads on demand) rather than growing this file. Run `/context` in a
  session to confirm it actually loaded.
-->

# MCP Tool Playbook — Shudhi Herbals Shopify Theme

Six MCPs are connected (`21st`, `magicuidesign-mcp`, `shadcn`, `animejs-mcp-server`, `playwright`, `chrome-devtools`), plus Claude Code's built-in Chrome integration. This file says which one to reach for and when. Tool/function names below are the current best-confirmed names — MCP packages update independently of this file, so if a call fails, run `/mcp` to confirm the live tool list before assuming the instruction is wrong.

## Roster

| Tool | Actually for | Hands back |
|---|---|---|
| **21st.dev** | Broad component catalog: search, inspiration, generate | React + Tailwind (shadcn-based) |
| **magicuidesign-mcp** | Curated "wow" effects: text reveal, number ticker, marquee, border-beam, blur-fade | React + Tailwind |
| **shadcn** | Accessible primitives — dialog, combobox, accordion — with correct Radix keyboard/focus-trap logic | React + Tailwind + Radix |
| **animejs-mcp-server** | Anime.js API reference: docs, examples, patterns — timelines, stagger, SVG morph/draw, scroll-linked motion | Vanilla JS — no React, no Tailwind |
| **playwright** | Automated browser: screenshots, console/network checks, form fills. Clean, isolated profile | Browser automation |
| **chrome-devtools** | Performance traces (LCP/CLS/FCP), Lighthouse, memory/network profiling | DevTools data |
| **Chrome (built-in)** | Same class of task as playwright, but on your real, logged-in Chrome profile | Browser automation |

## Rule 0 — this is a Liquid theme, not React

21st.dev, Magic UI, and shadcn all return React/Tailwind. This theme has no React runtime and no Tailwind build. **Never paste JSX or Tailwind class strings into a `.liquid` file — it will not render.** Call these three for the *pattern* — easing curves, stagger timing, ARIA/focus-trap behavior, `IntersectionObserver` usage — then hand-port that logic into vanilla HTML/CSS/JS matching this repo's existing `story-motion.js` conventions. Treat all three as one shared inspiration pool feeding one motion system, not three competing runtime libraries — mixing their actual runtime code produces inconsistent easing and bloated JS.

**animejs-mcp-server is different: it's vanilla JS**, so its examples can often be used close to verbatim — no React-porting step. Its real trap is version drift: Anime.js v4 (current) uses named imports (`import { animate, stagger } from 'animejs'`) and renamed params (`ease` not `easing`, `to` not `value`, no global `anime` object); the old v3 `anime({ targets: ... })` style will silently fail against a v4 install. Confirm which version any returned example targets before using it — default to v4 syntax unless there's a specific reason not to.

## Decision table

| Doing this | Reach for |
|---|---|
| Browsing for a general component (card, hero, pricing table) | 21st.dev — inspiration/search, not the generator, when you just want to look |
| Need a specific named effect (text reveal, number counter, marquee, blur-fade, border-beam) | magicuidesign-mcp — search its registry by name first |
| Need a dropdown/dialog/combobox/accordion with correct keyboard + focus-trap behavior | shadcn — don't hand-roll accessibility logic from scratch |
| Need a complex orchestrated timeline, SVG path draw-on/morph, or scroll-linked motion beyond simple fade/reveal | animejs-mcp-server — pull the real API/example, then either port the technique into `story-motion.js`, or add Anime.js itself via ESM/CDN import (no bundler needed) if the effect is complex enough to justify the dependency |
| "Does this section render right at mobile/tablet/desktop?" | playwright — `browser_navigate` + `browser_take_screenshot` at 375 / 768 / 1440px, compare against the reference |
| "Did my new JS break anything?" | playwright — `browser_console_messages` + `browser_network_requests` |
| Testing a form or add-to-cart flow end to end | playwright — `browser_fill_form` + `browser_click` |
| "Is the hero image still the LCP? Is my parallax janky?" | chrome-devtools — `performance_start_trace` / `performance_stop_trace` / `performance_analyze_insight` |
| "What's our Lighthouse score after this change?" | chrome-devtools — `lighthouse_audit` (a11y/SEO/best-practices only; performance is the separate trace tool above) |
| Checking the live, logged-in storefront or Shopify admin | Chrome (built-in) — playwright's profile is clean and won't be signed in to anything |

## "Crazy and premium" — what that means on this brand

Shudhi Herbals is calm Ayurvedic/herbal wellness, not a SaaS product demo. Here, premium means restraint, not maximalism — stacking effects from three different libraries reads as chaotic, not expensive.

- **Use freely:** fade/slide-up reveals, line-by-line text reveal, number count-ups, a subtle border/shine on hover, gentle scroll parallax (≤15px).
- **Avoid on this brand:** confetti, particles, meteors, "cool-mode," globes, anything bouncy, fast, or gamified — reads as playful/tech, not calm/premium.
- Every effect respects `prefers-reduced-motion` and never gates content visibility — motion enhances, it never blocks first paint.
- animejs-mcp-server is the most capable tool in this roster — spring easing, elaborate multi-element choreography, SVG morphing — which also makes it the easiest to overdo. The restraint rule above applies hardest here.

## Workflow loop for a new section or effect

1. Confirm the design reference (screenshot or existing spec doc) before building anything.
2. Pull 1–2 pattern references from 21st.dev / Magic UI / shadcn — inspiration only, per Rule 0.
3. Hand-port into Liquid + CSS + `story-motion.js`.
4. `playwright`: screenshot at three breakpoints, diff against the reference; check console for new errors.
5. `chrome-devtools`: performance trace on the changed page — confirm the LCP element and timing didn't regress; run the Lighthouse audit.
6. Fix regressions, repeat 4–5. Ship.

## Environment notes

- Playwright writes a `.playwright-mcp/` folder into the repo on use — add it to `.gitignore`.
- chrome-devtools requires Chrome **stable** (not Chromium/Edge) and Node 20.19+.
- chrome-devtools screenshots/HAR exports can get large — filter or downscale rather than pulling full-res by default.
- 21st.dev's component-builder tool has a known intermittent bug returning malformed output; if that happens, fall back to its inspiration/search tool and hand-build rather than retrying blindly.
- `@pavithra.kvp5/animejs-mcp-server` is a small, unofficial community package, not published by the animejs.com team, and adoption is very low — spot-check anything it returns against animejs.com/documentation, especially the v3-vs-v4 syntax question above.






