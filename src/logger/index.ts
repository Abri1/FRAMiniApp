// src/logger/index.ts
// Centralized logger for Forex Ring Alerts
// Modular, composable, and testable (follows global rules)
// Now supports forwarding logs to Axiom if configured

import { createLogger, format, transports } from 'winston';
import Transport from 'winston-transport';

// Define a concise console format: level and message only
const consoleFormat = format.combine(
  format.colorize(),
  format.printf(({ level, message }) => `${level}: ${message}`)
);
const loggerTransports: Transport[] = [
  new transports.Console({
    format: consoleFormat
  })
];

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: loggerTransports
});

export default logger;
