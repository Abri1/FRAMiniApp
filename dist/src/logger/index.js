"use strict";
// src/logger/index.ts
// Centralized logger for Forex Ring Alerts
// Modular, composable, and testable (follows global rules)
// Now supports forwarding logs to Axiom if configured
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = require("winston");
const winston_transport_1 = __importDefault(require("winston-transport"));
const js_1 = require("@axiomhq/js");
const axiomToken = process.env.AXIOM_TOKEN;
const axiomDataset = process.env.AXIOM_DATASET;
const axiomOrgId = process.env.AXIOM_ORG_ID; // Optional, for org-scoped tokens
// Custom Winston transport for Axiom
class AxiomTransport extends winston_transport_1.default {
    constructor(opts) {
        super(opts);
        this.axiom = new js_1.Axiom({
            token: opts.token,
            orgId: opts.orgId,
        });
        this.dataset = opts.dataset;
    }
    log(info, callback) {
        setImmediate(() => this.emit('logged', info));
        Promise.resolve(this.axiom.ingest(this.dataset, Object.assign(Object.assign({}, info), { level: info.level, message: info.message, timestamp: info.timestamp || new Date().toISOString() }))).catch(() => { });
        callback();
    }
}
// Define a concise console format: level and message only
const consoleFormat = winston_1.format.combine(winston_1.format.colorize(), winston_1.format.printf(({ level, message }) => `${level}: ${message}`));
const loggerTransports = [
    new winston_1.transports.Console({
        format: consoleFormat
    })
];
if (axiomToken && axiomDataset) {
    loggerTransports.push(new AxiomTransport({
        token: axiomToken,
        dataset: axiomDataset,
        orgId: axiomOrgId,
        level: 'info',
    }));
}
const logger = (0, winston_1.createLogger)({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.errors({ stack: true }), winston_1.format.splat(), winston_1.format.json()),
    transports: loggerTransports
});
exports.default = logger;
