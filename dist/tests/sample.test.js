"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Sample Test', () => {
    (0, globals_1.it)('should pass', () => {
        (0, globals_1.expect)(1 + 1).toBe(2);
    });
});
