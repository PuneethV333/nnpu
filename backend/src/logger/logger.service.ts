import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import chalk from 'chalk';

@Injectable()
export class LoggerService implements NestLoggerService {
  private timestamp() {
    return new Date().toISOString();
  }

  log(message: string, context?: string) {
    console.log(
      chalk.green(
        `[${this.timestamp()}] [LOG]${context ? ` [${context}]` : ''} ${message}`,
      ),
    );
  }

  error(message: string, trace?: string, context?: string) {
    console.error(
      chalk.red(
        `[${this.timestamp()}] [ERROR]${context ? ` [${context}]` : ''} ${message}`,
      ),
    );
    if (trace) console.error(trace);
  }

  warn(message: string, context?: string) {
    console.warn(
      chalk.yellow(
        `[${this.timestamp()}] [WARN]${context ? ` [${context}]` : ''} ${message}`,
      ),
    );
  }

  debug(message: string, context?: string) {
    console.debug(
      chalk.blue(
        `[${this.timestamp()}] [DEBUG]${context ? ` [${context}]` : ''} ${message}`,
      ),
    );
  }

  verbose(message: string, context?: string) {
    console.log(
      chalk.gray(
        `[${this.timestamp()}] [VERBOSE]${context ? ` [${context}]` : ''} ${message}`,
      ),
    );
  }
}
