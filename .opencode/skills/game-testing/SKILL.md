---
name: game-testing
description: Automated and manual test workflow for rustgame — Vitest unit tests, build verification, the detect-fix-rerun loop, and definition of done. Use when adding tests, running the suite, a test fails, verifying a change before reporting done, or when the user mentions test, tests failing, npm test, Vitest, coverage or "write tests".
---

# game-testing

## Pipeline

```
Build → Run → Test → Detect Error → Fix → Run Again
```

Two layers, both required before "done":

1. **Unit tests** (fast, pure systems) — `npm test` (Vitest;
   legacy suite `tests/phase1.test.mjs` runs under plain Node)
2. **Browser verification** — `browser-game-verification` (real game, console)

## What to test (priority order)

| System | Why | Example assertions |
|---|---|---|
| `SurvivalSystem.tick` | core loop math | hunger=0 → HP drops by `starvationDamage*dt`; well-fed → regen |
| `DamageSystem` | all HP flows here | clamp at 0, invalid amounts ignored, heal caps at max |
| `SaveSystem` | data safety | v1→v2 migration, corrupt → null/status, round-trip |
| `StaminaSystem` | sprint lockout | below minimum blocks sprint, cold slows regen |
| `StorageInventory` | economy integrity | stack limits, no negatives, unknown ids rejected |
| `crafting` | costs | failure consumes nothing, qty multiplies cost |
| `WeatherSystem`/`DayNight` | seeded transitions | exact state after N seconds |
| `InputSystem` | controls | keyboard/touch providers → correct Actions |

## Rules

1. **Pure systems only** in unit tests — no DOM, no THREE, no real
   localStorage (inject memory backends/clocks/rng).
2. **Test before you change math**: write/adjust the test first; a balance
   change without a test is a regression risk.
3. **Deterministic**: inject rng/clock (`Date.now()` is banned in pure logic —
   inject it).
4. Tests live in `tests/*.test.ts` (Vitest). Keep the legacy
   `phase1.test.mjs` green during migration — do not delete coverage without
   a Vitest equivalent.
5. Never weaken an assertion to make a test pass — fix the code or
   consciously update the expectation and say so in the summary.

## Definition of Done (report all)

- [ ] `npm test` — all green (paste summary line)
- [ ] `npm run build` — succeeds
- [ ] No new console errors (`browser-game-verification`)
- [ ] New behavior covered by ≥1 test; edge cases (0, negative, max, corrupt) hit

## Debugging a failing test

1. Read assertion diff — is it rounding, ordering, or a real logic break?
2. Reproduce minimally (call the function directly in a scratch test)
3. Fix in the system, not in the test (unless the expectation was wrong —
   justify it)
4. Re-run full suite, not just the failing file
