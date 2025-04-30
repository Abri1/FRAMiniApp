// src/logger/index.ts
// Centralized logger for Forex Ring Alerts
// Modular, composable, and testable (follows global rules)
// Now supports forwarding logs to Axiom if configured

import { createLogger, format, transports } from 'winston';
import Transport from 'winston-transport';
import { Axiom } from '@axiomhq/js';

const axiomToken = process.env.AXIOM_TOKEN;
const axiomDataset = process.env.AXIOM_DATASET;
const axiomOrgId = process.env.AXIOM_ORG_ID; // Optional, for org-scoped tokens

// Custom Winston transport for Axiom
class AxiomTransport extends Transport {
  private axiom;
  private dataset;
  constructor(opts: any) {
    super(opts);
    this.axiom = new Axiom({
      token: opts.token,
      orgId: opts.orgId,
    });
    this.dataset = opts.dataset;
  }
  log(info: any, callback: () => void) {
    setImmediate(() => this.emit('logged', info));
    Promise.resolve(
      this.axiom.ingest(this.dataset, {
        ...info,
        level: info.level,
        message: info.message,
        timestamp: info.timestamp || new Date().toISOString(),
      })
    ).catch(() => {/* Swallow errors to avoid crashing logger */});
    callback();
  }
}

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

if (axiomToken && axiomDataset) {
  loggerTransports.push(new AxiomTransport({
    token: axiomToken,
    dataset: axiomDataset,
    orgId: axiomOrgId,
    level: 'info',
  }) as Transport);
}

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
