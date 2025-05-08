# Forex Ring Alerts V4 — Telegram Mini App Migration

## Project Overview
This project is migrating from a classic Telegram bot to a modern Telegram Mini App, providing a native-like, responsive UI inside Telegram. All business logic will be accessible via a REST API, and the Mini App will be the primary user interface.

- **Frontend:** React Mini App (in `src/webapp/`)
- **Backend:** Node.js REST API (in `src/api/`), reusing/refactoring existing business logic
- **Bot:** Telegram bot for launching the Mini App and legacy command support
- **Database:** Supabase (Postgres)
- **Hosting:** Railway (Node.js + static frontend)

## Migration Status
- [x] Migration plan and context documented
- [ ] Mini App frontend scaffolded
- [ ] REST API endpoints implemented
- [ ] Bot updated to launch Mini App
- [ ] Full E2E testing
- [ ] Deployment to Railway

## Onboarding
- See `docs/IMPLEMENTATION_PLAN.md` for step-by-step progress and next actions.
- See `docs/CONTEXT.md` for architectural rationale and key decisions.
- All configuration is managed via `.env` files (never hardcoded).

---

_Last updated: 2025-05-02_
