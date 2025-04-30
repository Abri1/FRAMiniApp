"use strict";
// Main entrypoint for Forex Ring Alerts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("./logger"));
const telegram_1 = require("./integrations/telegram");
const config_1 = require("./config");
const config = (0, config_1.loadConfig)();
function startPolling() {
    return __awaiter(this, void 0, void 0, function* () {
        let offset = 0;
        logger_1.default.info('Starting Telegram polling loop...');
        while (true) {
            try {
                const updates = yield (0, telegram_1.getUpdates)(offset);
                logger_1.default.info('Fetched updates: %o', updates); // DEBUG: Log all fetched updates
                for (const update of updates) {
                    yield (0, telegram_1.processUpdate)(update);
                    offset = update.update_id + 1;
                }
            }
            catch (err) {
                logger_1.default.error('Polling error: %o', err);
            }
            yield new Promise(res => setTimeout(res, 1000)); // Poll every second
        }
    });
}
startPolling();
