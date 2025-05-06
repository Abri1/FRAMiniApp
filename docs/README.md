# Forex Ring Alerts Documentation

## Architectural Simplification (2025-05-03)
- The Express API server and Twilio webhook endpoint are no longer required.
- All notification logic (including Twilio voice calls) is handled in the main bot process.
- See `CONTEXT.md` and `IMPLEMENTATION_PLAN.md` for details and rationale.
