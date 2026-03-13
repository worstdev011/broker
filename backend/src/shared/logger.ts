import pino, { type Logger as PinoLogger } from 'pino';
import { env } from '../config/env.js';

const pinoInstance = pino({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  ...(env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
            colorize: true,
          },
        },
      }
    : {}),
  formatters: {
    level: (label) => ({ level: label }),
  },
});

type LogFn = (msgOrObj: string | object, ...args: unknown[]) => void;

/**
 * Wraps a pino log method to support both Pino-native and convenience patterns:
 *   logger.info('message')
 *   logger.info({ key: 'val' }, 'message')
 *   logger.error('message', new Error('...'))  — auto-wraps Error into { err }
 */
function makeLogFn(base: PinoLogger, level: 'info' | 'warn' | 'error' | 'debug'): LogFn {
  const fn = base[level].bind(base);

  return (msgOrObj: string | object, ...args: unknown[]) => {
    if (typeof msgOrObj === 'object') {
      fn(msgOrObj, (args[0] as string) ?? '');
      return;
    }

    if (args.length > 0 && args[0] instanceof Error) {
      fn({ err: args[0] }, msgOrObj);
      return;
    }

    fn(msgOrObj);
  };
}

export interface AppLogger {
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  debug: LogFn;
  child(bindings: Record<string, unknown>): AppLogger;
}

function createLogger(base: PinoLogger): AppLogger {
  return {
    info: makeLogFn(base, 'info'),
    warn: makeLogFn(base, 'warn'),
    error: makeLogFn(base, 'error'),
    debug: makeLogFn(base, 'debug'),
    child(bindings: Record<string, unknown>): AppLogger {
      return createLogger(base.child(bindings));
    },
  };
}

export const logger = createLogger(pinoInstance);
