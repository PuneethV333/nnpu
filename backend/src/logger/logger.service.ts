import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino from 'pino';

/**
 * Resolved lazily, on first use, rather than at module load.
 *
 * `const isDev = process.env.NODE_ENV !== 'production'` used to run when this
 * file was first imported — which happens while Nest is still building the
 * module graph, *before* ConfigModule has read `.env`. Any NODE_ENV that lived
 * only in `.env` was therefore invisible here, so a production deploy without
 * NODE_ENV in the real process environment got `isDev === true`: debug-level
 * logging and the pino-pretty transport in production, which is both noisy and
 * a formatting tax on every line.
 */
let logger: pino.Logger | undefined;

const getLogger = (): pino.Logger => {
  if (logger) return logger;

  const isDev = process.env['NODE_ENV'] !== 'production';

  logger = pino({
    level: isDev ? 'debug' : 'info',
    transport: isDev
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            levelFirst: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
            singleLine: true,
          },
        }
      : undefined, // structured JSON in production, no transport overhead
  });

  return logger;
};

@Injectable()
export class LoggerService implements NestLoggerService {
  log(message: string, context?: string) {
    getLogger().info({ context }, message);
  }

  error(message: string, trace?: string, context?: string) {
    getLogger().error({ context, trace }, message);
  }

  warn(message: string, context?: string) {
    getLogger().warn({ context }, message);
  }

  debug(message: string, context?: string) {
    getLogger().debug({ context }, message);
  }

  verbose(message: string, context?: string) {
    getLogger().trace({ context }, message);
  }
}
