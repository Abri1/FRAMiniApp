# Forex Ring Alerts V4

## Overview
Forex Ring Alerts is a robust, production-ready Telegram bot for creating, managing, and receiving instant forex price alerts. The system is designed for reliability, maintainability, and world-class code quality.

## Key Features
- Create price alerts for all major forex pairs
- Receive notifications via Telegram and voice call
- Unified, strict input validation for all alert creation paths
- Modular, maintainable TypeScript codebase
- All configuration and secrets externalized
- Automated tests and CI/CD ready

## Input Validation (2025 Update)
All user input for alert creation is now strictly validated:
- **Pair Format:** Must be a valid 6-letter forex pair (e.g., EURUSD, USDJPY)
- **Direction:** Only "above" or "below" are accepted
- **Price:**
  - JPY pairs: allow integer or up to 3 decimals (e.g., 123, 123.456)
  - All others: require decimal point and up to 5 decimals (e.g., 1.2500)
- **Negative and zero prices are rejected**
- **Validation is enforced in both the `/createalert` command and the menu/button Set Alert flow**

## Clean, Production-Ready Code
- All debug and troubleshooting logs have been removed
- Codebase is fully documented and adheres to strict project rules
- All validation logic is covered by unit and integration tests

## Getting Started
1. Clone the repo
2. Create a `.env` file by copying `.env.example` (`cp .env.example .env`) and fill in your specific values. Ensure `MINI_APP_URL` is set to your deployed Mini App's URL.
3. Install dependencies: `npm install`
4. Build: `npm run build`
5. Start: `npm run start`

## Database Backups
To enable automated database backups, set your Supabase/Postgres connection string as an environment variable before running the backup script:

```
export SUPABASE_CONN_STRING="postgresql://postgres:[Abri1993!!]@db.gdebzwtwlrbhjyxcddvc.supabase.co:5432/postgres"
```
Add this line to your `~/.zshrc` or `~/.bash_profile` for persistence, then reload your shell config (`source ~/.zshrc` or `source ~/.bash_profile`).

Run the backup script with:
```
./backup_supabase.sh
```

See script comments for cron scheduling and restore instructions.

## Environment Variables

The application requires the following environment variables to be set (see `.env.example`):
- `TELEGRAM_BOT_TOKEN`: Your Telegram Bot API token.
- `MINI_APP_URL`: The full URL to your deployed Telegram Mini App frontend.
- `FOREX_API_KEY`: API key for the forex data provider.
- `FOREX_API_URL`: URL for the forex data provider API.
- `SUPABASE_URL`: Your Supabase project URL.
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key.
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key.
- `TWILIO_ACCOUNT_SID`: (Optional) Twilio Account SID for voice call alerts.
- `TWILIO_AUTH_TOKEN`: (Optional) Twilio Auth Token.
- `TWILIO_PHONE_NUMBER`: (Optional) Twilio phone number used for sending alerts.
- `SENTRY_DSN`: (Optional) Sentry DSN for error tracking.
- `NODE_ENV`: Set to `production` for production builds, `development` otherwise.
- `PORT`: Port for the application to run on (defaults to 3000).

## Contributing
See `docs/IMPLEMENTATION_PLAN.md` and `docs/CONTEXT.md` for project rules, context, and progress tracking.

## License
ISC

## Twilio Voice Calls
- The system sends voice call alerts via Twilio, but does **not** track or store call statuses (delivered, failed, etc.).
- The Express API server and Twilio webhook endpoint have been removed for simplicity and security.
- All notification logic is handled in the main bot process.
