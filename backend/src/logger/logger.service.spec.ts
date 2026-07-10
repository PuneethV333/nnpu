/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggerService],
    }).compile();

    service = module.get<LoggerService>(LoggerService);

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('log() writes to console.log with the message included', () => {
    service.log('hello world');
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy.mock.calls[0][0]).toContain('hello world');
    expect(consoleLogSpy.mock.calls[0][0]).toContain('[LOG]');
  });

  it('log() includes context when provided', () => {
    service.log('hello', 'AuthService');
    expect(consoleLogSpy.mock.calls[0][0]).toContain('[AuthService]');
  });

  it('error() writes to console.error and includes trace if given', () => {
    service.error('something broke', 'stack-trace-here');
    expect(consoleErrorSpy).toHaveBeenCalledTimes(2); // once for message, once for trace
    expect(consoleErrorSpy.mock.calls[0][0]).toContain('something broke');
    expect(consoleErrorSpy.mock.calls[1][0]).toBe('stack-trace-here');
  });

  it('warn() writes to console.warn with the message included', () => {
    service.warn('careful now');
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy.mock.calls[0][0]).toContain('careful now');
  });
});
