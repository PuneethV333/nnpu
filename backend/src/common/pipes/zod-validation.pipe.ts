import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    try {
      const parsed = this.schema.parse(value);
      return parsed;
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.message;
        throw new BadRequestException(`Validation failed: ${messages}`);
      }
      throw new BadRequestException('Validation failed');
    }
  }
}
