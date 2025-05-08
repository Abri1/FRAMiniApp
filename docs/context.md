# CONTEXT: Telegram Mini App Migration (2024/2025)

## Rationale
- Telegram Mini Apps provide a modern, native-like UI inside Telegram, replacing the old console-style bot interface.
- The current bot is feature-complete but limited by Telegram's text-based UI. Migrating to a Mini App will improve UX, engagement, and future extensibility.
- Hosting will be on Railway, supporting Node.js backend and static frontend.

## Key Decisions
- **Frontend:** React (with Vite) for the Mini App UI, in `src/webapp/`.
- **Backend:** Node.js REST API, reusing/refactoring existing business logic, with endpoints for all Mini App features.
- **Auth:** Telegram WebApp `initData` validation for secure user sessions.
- **Bot:** Will send a `web_app` button to launch the Mini App, and optionally set as Main Mini App via BotFather.
- **Design:** Mobile-first, responsive, theme-aware, matching Telegram's look and feel.
- **Testing:** Unit, integration, and E2E tests for all new code.

## References
- [Official Telegram Mini Apps Docs](https://core.telegram.org/bots/webapps)
- [Telegram Mini Apps SDK](https://docs.telegram-mini-apps.com/)

## Migration Context
- All business logic must be accessible via REST API for the Mini App.
- The Mini App must validate all user sessions using Telegram's signature method.
- The bot will retain legacy command support for transition, but the Mini App will be the primary interface.
- All configuration and secrets will be externalized for Railway deployment.

## 2025-Phase3-API
- All core alert management endpoints (`GET/POST/PUT/DELETE /api/alerts`) are now exposed for the Mini App, reusing existing business logic from the bot and integrations.
- Endpoints are protected by Telegram Mini App auth middleware (signature validation to be finalized).
- Next: Wire up the Mini App frontend to these endpoints for full alert management.

---

_This context must be updated with any major architectural or process changes during the migration._
