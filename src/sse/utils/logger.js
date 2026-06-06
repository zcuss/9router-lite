// Logger utility for cloud using pino
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: process.env.NODE_ENV !== "production" ? {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss Z",
      ignore: "pid,hostname",
    }
  } : undefined
});

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const LEVEL = LOG_LEVELS.DEBUG;

function formatTime() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function formatData(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

export function debug(tag, message, data) {
  logger.debug({ tag, data }, message);
}

export function info(tag, message, data) {
  logger.info({ tag, data }, message);
}

export function warn(tag, message, data) {
  logger.warn({ tag, data }, message);
}

export function error(tag, message, data) {
  logger.error({ tag, data }, message);
}

export function request(method, path, extra) {
  logger.info({ method, path, extra }, `Request: ${method} ${path}`);
}

export function response(status, duration, extra) {
  logger.info({ status, duration, extra }, `Response: ${status} (${duration}ms)`);
}

export function stream(event, data) {
  logger.info({ event, data }, `Stream: ${event}`);
}

// Mask sensitive data
export function maskKey(key) {
  if (!key || key.length < 8) return "***";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

