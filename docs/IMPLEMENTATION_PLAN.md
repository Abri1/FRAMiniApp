# IMPLEMENTATION PLAN: Telegram Mini App Migration

## Phase 1: Documentation & Planning
- [x] Audit codebase and document current architecture
- [x] Research and summarize latest Telegram Mini App documentation
- [x] Update CONTEXT.md with rationale, decisions, and references
- [x] Update README.md with migration overview and onboarding
- [x] Create/Update this implementation plan

## Phase 2: Frontend — Mini App UI
- [x] Scaffold `src/webapp/` with React + Vite *(complete, dependencies installed)*
- [x] Integrate Telegram WebApp JS SDK (`telegram-web-app.js`) *(script loaded in entry HTML)*
- [x] Implement Telegram WebApp login/auth (extracts and displays Telegram user info and initData; ready for backend validation)
- [x] Resolve npm install issues with sudo; all dependencies now installed
- [x] Build UI for:
  - [x] Alerts (list, create, edit, delete) *(scaffolded, with loading/empty/error states)*
  - [x] Account info *(scaffolded)*
  - [x] Info/help page *(scaffolded)*
- [x] Add minimal tab navigation between main pages
- [x] Make UI responsive, theme-aware, and mobile-first *(complete)*
- [x] Add basic branding (logo, colors) *(complete)*
- [x] Integrate frontend with backend API for full alert management *(polished, production-ready UX)*

## Phase 3: Backend — API & Logic
- [x] Refactor business logic into service modules (single-responsibility)
- [x] Implement REST API endpoints for all Mini App features *(alerts: list, create, update, delete)*
- [ ] Add Telegram WebApp JWT auth middleware (validate `initData`)
- [ ] Serve Mini App frontend from backend

## Phase 4: Bot Integration
- [>] Update bot to send `web_app` button (keyboard/inline) to launch Mini App *(next step)*
- [ ] (Optional) Set Main Mini App via BotFather for profile/menu access
- [ ] (Optional) Retain legacy command support for transition

## Phase 5: Deployment & CI/CD
- [ ] Add Railway configuration for monorepo (Node.js + static frontend)
- [ ] Ensure all config/secrets are in `.env` and `.env.example`
- [ ] Add CI/CD for build, lint, and test (backend & frontend)

## Phase 6: Testing
- [ ] Add/expand unit and integration tests for API and business logic
- [ ] Add E2E tests for Mini App (Cypress/Playwright)
- [ ] Manual QA in Telegram test environment

## Phase 7: Launch & Handover
- [ ] Deploy to Railway (production)
- [ ] Update docs for onboarding and support
- [ ] Announce migration to users (via bot and channels)

---

_Track progress by checking off each item. Update this file after every completed step or major decision._
