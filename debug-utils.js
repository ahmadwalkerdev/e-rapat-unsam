const DEBUG_LOGS = false;

export const debugLog = (...args) => {
if (DEBUG_LOGS) console.log(...args);
};

export const debugError = (...args) => {
if (DEBUG_LOGS) console.error(...args);
};
