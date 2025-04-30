# Forex Ring Alerts

A world-class SaaS platform for monitoring and notifying users about key forex market indicators and price movements via Telegram and other channels.

## Features
- Real-time forex price alerts
- Telegram bot integration for user interaction
- Modular, scalable TypeScript/Node.js architecture
- Robust integrations: Forex data APIs, Supabase, notification services
- Comprehensive error handling, monitoring, and security

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm
- Telegram account (for bot setup)
- API keys for forex data and notification providers (see `.env.example`)

### Setup
1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd Forex\ Ring\ Alerts
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy and configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and settings
   ```
4. Build the project:
   ```bash
   npx tsc
   ```
5. Run tests:
   ```bash
   npm test
   ```
6. Start the application:
   ```bash
   npm start
   ```

## Project Structure
See `docs/implementation.md` for a detailed breakdown.

## Contributing
- Follow the guidelines in `docs/global_rules.md` and `docs/implementation.md`.
- Keep documentation up to date with every change.
- Write clear, maintainable, and well-tested code.
- Log all major decisions and blockers in `Docs/CONTEXT.md`.

## License
[ISC](LICENSE)
