/**
 * Logger that logs in both development and production
 * - In development: all log levels are active
 * - In production: error and warn are always logged, info/log only if ENABLE_LOGS is set
 */
const isDev = process.env.NODE_ENV === "development";
const enableProdLogs = process.env.ENABLE_LOGS === "true";

export const logger = {
    log: (...args: any[]) => {
        if (isDev || enableProdLogs) {
            console.log(...args);
        }
    },
    error: (...args: any[]) => {
        // Always log errors, even in production
        console.error(...args);
    },
    warn: (...args: any[]) => {
        // Always log warnings, even in production
        console.warn(...args);
    },
    info: (...args: any[]) => {
        if (isDev || enableProdLogs) {
            console.info(...args);
        }
    },
};
