# Project State

**Project:** ProdeazoApp
**Last Activity:** 2026-05-14
**Status:** Planning

## Current Phase
Phase 1: DB Schema + Migration — Not started

## Phase Status
| Phase | Name | Status |
|-------|------|--------|
| 1 | DB Schema + Migration | Not started |
| 2 | Backend — Seed + API | Not started |
| 3 | Frontend — Tournament Store + Selector + Wiring | Not started |

## Decisions
- Teams are global (shared across tournaments) — no tournamentId on teams table
- Predictions do not get a direct tournamentId FK — scope is derived via fixture → tournament join
- All endpoints fall back to `isDefault = true` tournament when no `tournamentId` param is provided
- Mundial (World Cup 2026) is the default tournament (isDefault = true)
- Cache keys must include tournamentId to avoid cross-tournament cache pollution
