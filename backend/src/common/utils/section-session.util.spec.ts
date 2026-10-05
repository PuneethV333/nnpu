import {
  authIdSessionSegment,
  sectionDisplayName,
  sectionName,
  sectionSessionKey,
} from './section-session.util';
import { BadRequestException } from '@nestjs/common';

describe('section session naming', () => {
  describe('sectionSessionKey / sectionDisplayName', () => {
    it.each([
      ['Science', 'A', 'SCI-A', 'A'],
      ['Commerce', 'A', 'COM-A', 'A'],
      ['Science', 'B', 'SCI-B', 'B'],
      ['Commerce', 'B', 'COM-B', 'B'],
    ])('%s + %s round-trips via %s', (stream, label, key, back) => {
      expect(sectionSessionKey(stream as 'Science' | 'Commerce', label)).toBe(
        key,
      );
      expect(sectionDisplayName(key)).toBe(back);
    });

    it('passes an unprefixed value through unchanged', () => {
      // Older rows, and callers holding the plain label.
      expect(sectionDisplayName('A')).toBe('A');
    });
  });

  describe('sectionName', () => {
    it('builds the stored name from the class name and session key', () => {
      expect(sectionName('1', 'SCI-A')).toBe('1-SCI-A');
      expect(sectionName('2', 'COM-B')).toBe('2-COM-B');
    });

    it('does not require PU1, so a class-2 section cannot be mislabelled', () => {
      // EnrollmentService hardcoded "1-" while accepting a classId.
      expect(sectionName('2', sectionSessionKey('Science', 'A'))).toBe(
        '2-SCI-A',
      );
    });
  });

  describe('authIdSessionSegment', () => {
    it.each([
      ['SCI-A', 'A'],
      ['COM-A', 'A'],
      ['SCI-B', 'B'],
    ])('reduces %s to the single-character segment %s', (key, segment) => {
      expect(authIdSessionSegment(key)).toBe(segment);
    });

    it('accepts an already-plain label', () => {
      expect(authIdSessionSegment('A')).toBe('A');
    });

    it('upper-cases the segment so authIds stay uniform', () => {
      expect(authIdSessionSegment('a')).toBe('A');
    });

    it('rejects a multi-character label rather than widening the authId', () => {
      // authIds are fixed-width: nnpu{class}{stream}{combo}{yy}{lang}{session}{nnn}
      // A wider segment silently changes the id's length, which is unrecoverable
      // for the student holding it.
      expect(() => authIdSessionSegment('SCI-A1')).toThrow(BadRequestException);
      expect(() => authIdSessionSegment('AB')).toThrow(BadRequestException);
      expect(() => authIdSessionSegment('')).toThrow(BadRequestException);
    });
  });
});
