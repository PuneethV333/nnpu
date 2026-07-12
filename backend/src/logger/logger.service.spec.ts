import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggerService],
    }).compile();

    service = module.get<LoggerService>(LoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('log() does not throw', () => {
    expect(() => service.log('hello', 'TestContext')).not.toThrow();
  });

  it('error() does not throw, with trace', () => {
    expect(() =>
      service.error('broke', 'stack trace', 'TestContext'),
    ).not.toThrow();
  });

  it('warn() does not throw', () => {
    expect(() => service.warn('careful')).not.toThrow();
  });
});
