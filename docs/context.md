# Context & Decisions

## 2025-05-03: Removal of Twilio Call Status Tracking
- Removed all code and database fields related to `call_sid` and `call_status` in the alerts table.
- Deleted the Express API server (`src/api/server.ts`) as it was only used for Twilio webhook callbacks.
- Decision: We do not need to track or store Twilio call statuses. The system only needs to send calls, not audit their delivery.
- Rationale: Simplifies deployment, reduces attack surface, and improves maintainability. All notification logic is now handled in the main bot process.
- Database migration applied to drop these columns from production.

## 2025-05-04: Twilio Call Playback Only After Answer
- Twilio call flow now uses a TwiML <Redirect> to a /api/twilio/play-message endpoint, so the message only plays after the call is answered.
- Rationale: Ensures users never miss the start of the message, even if they answer late. This is a best practice for voice notification systems and improves user experience.
