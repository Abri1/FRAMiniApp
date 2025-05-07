# Forex Ring Alerts Documentation

## Architectural Simplification (2025-05-03)
- The Express API server and Twilio webhook endpoint are no longer required.
- All notification logic (including Twilio voice calls) is handled in the main bot process.
- Twilio call flow now uses a TwiML <Redirect> to /api/twilio/play-message, so the message only plays after the call is answered. This prevents users from missing the start of the message if they answer late.
- See `CONTEXT.md` and `IMPLEMENTATION_PLAN.md` for details and rationale.
