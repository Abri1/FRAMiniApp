# Context & Decisions

## 2025-05-03: Removal of Twilio Call Status Tracking
- Removed all code and database fields related to `call_sid` and `call_status` in the alerts table.
- Deleted the Express API server (`src/api/server.ts`) as it was only used for Twilio webhook callbacks.
- Decision: We do not need to track or store Twilio call statuses. The system only needs to send calls, not audit their delivery.
- Rationale: Simplifies deployment, reduces attack surface, and improves maintainability. All notification logic is now handled in the main bot process.
- Database migration applied to drop these columns from production.
