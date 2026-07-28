import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { REDIS_CLIENT } from './redis.constants';
import { LoggerService } from '@/logger/logger.service';

describe('RedisService', () => {
  let service: RedisService;

  const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    on: jest.fn(),
    quit: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: REDIS_CLIENT, useValue: mockRedisClient },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns null for a missing key', async () => {
    mockRedisClient.get.mockResolvedValue(null);
    const result = await service.get('missing-key');
    expect(result).toBeNull();
  });

  it('parses and returns JSON for an existing key', async () => {
    mockRedisClient.get.mockResolvedValue(JSON.stringify({ foo: 'bar' }));
    const result = await service.get('some-key');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('returns null if JSON parsing fails', async () => {
    mockRedisClient.get.mockResolvedValue('not-json{{{');
    const result = await service.get('bad-key');
    expect(result).toBeNull();
  });

  it('calls redis.set with stringified value and default ttl', async () => {
    await service.set('key', { a: 1 });
    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'key',
      JSON.stringify({ a: 1 }),
      'EX',
      3600,
    );
  });

  it('deletes a key and returns true if removed', async () => {
    mockRedisClient.del.mockResolvedValue(1);
    const result = await service.del('key');
    expect(result).toBe(true);
  });

  it('returns false if key did not exist on delete', async () => {
    mockRedisClient.del.mockResolvedValue(0);
    const result = await service.del('key');
    expect(result).toBe(false);
  });
});
