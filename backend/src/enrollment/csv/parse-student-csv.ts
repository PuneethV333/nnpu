import { BadRequestException } from '@nestjs/common';
import { SecondLanguage, Stream } from '@/generated/prisma';

/** One student's row, after validation. */
export interface StudentCsvRow {
  /** 1-based line number in the original file, for error messages. */
  line: number;
  name: string;
  email: string;
  stream: Stream;
  /** The `Combination.idCode` as written in the CSV (e.g. "PCMB"). */
  combinationCode: string;
  language: SecondLanguage;
}

/** A row that could not be used, kept so the operator can fix the file. */
export interface StudentCsvRowError {
  line: number;
  name: string;
  reason: string;
}

export interface ParsedStudentCsv {
  rows: StudentCsvRow[];
  errors: StudentCsvRowError[];
}

const REQUIRED_HEADERS = [
  'name',
  'email',
  'stream',
  'combination',
  'language',
] as const;

/**
 * Streams are matched case-insensitively, because a spreadsheet will happily
 * hand back "science", "Science" or "SCIENCE" from the same column.
 */
const STREAM_BY_INPUT: Record<string, Stream> = {
  science: 'Science',
  commerce: 'Commerce',
};

const LANGUAGE_BY_INPUT: Record<string, SecondLanguage> = {
  kannada: 'Kannada',
  hindi: 'Hindi',
  sanskrit: 'Sanskrit',
};

/**
 * Deliberately permissive: this only rejects addresses that cannot be valid.
 * A strict RFC 5322 regex rejects real addresses (quoted local parts, TLDs
 * with punycode) and this column is the one thing standing between an admin
 * and a typo'd credentials email that never arrives.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/**
 * Splits one CSV line, honouring double-quoted fields.
 *
 * Written by hand rather than pulled from a CSV library because a correct
 * RFC 4180 parser is ~40 lines and the alternative is a dependency that also
 * has to agree with our header validation. Quotes matter here because a name
 * like `"Rao, Ananya"` is exactly the kind of value that would otherwise be
 * silently split into two columns.
 */
const splitCsvLine = (line: string): string[] => {
  const out: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // `""` inside a quoted field is a literal quote.
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      out.push(field);
      field = '';
    } else {
      field += char;
    }
  }

  out.push(field);
  return out;
};

/** Drops a UTF-8 BOM, which Excel writes and which breaks the first header. */
const stripBom = (value: string): string =>
  value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;

export const parseStudentCsv = (content: string): ParsedStudentCsv => {
  const allLines = content.split(/\r\n|\n|\r/);

  // Blank lines are padding in every spreadsheet export, and a trailing
  // newline is normal, so they are skipped — but the ORIGINAL index is carried
  // along. Filtering first would renumber everything after the first blank
  // line, so an error reported for row 7 of the file would say row 6, which is
  // exactly the line the operator needs to look at.
  const lines = allLines
    .map((text, index) => ({ text, line: index + 1 }))
    .filter((row) => row.text.trim().length > 0);

  if (lines.length === 0) {
    throw new BadRequestException('The CSV file is empty');
  }

  const header = splitCsvLine(stripBom(lines[0].text)).map((h) =>
    h.trim().toLowerCase(),
  );

  const missing = REQUIRED_HEADERS.filter((h) => !header.includes(h));
  if (missing.length > 0) {
    throw new BadRequestException(
      `CSV is missing required column(s): ${missing.join(', ')}. Expected header: ${REQUIRED_HEADERS.join(', ')}`,
    );
  }

  const index = Object.fromEntries(
    REQUIRED_HEADERS.map((h) => [h, header.indexOf(h)]),
  ) as Record<(typeof REQUIRED_HEADERS)[number], number>;

  const rows: StudentCsvRow[] = [];
  const errors: StudentCsvRowError[] = [];
  const seenEmails = new Map<string, number>();

  for (let i = 1; i < lines.length; i++) {
    const { text, line } = lines[i];
    const cells = splitCsvLine(text);

    const cell = (key: (typeof REQUIRED_HEADERS)[number]): string =>
      (cells[index[key]] ?? '').trim();

    const name = cell('name');
    const email = cell('email').toLowerCase();
    const rawStream = cell('stream').toLowerCase();
    const combinationCode = cell('combination').toUpperCase();
    const rawLanguage = cell('language').toLowerCase();

    const reject = (reason: string) => {
      errors.push({ line, name: name || '(no name)', reason });
    };

    if (!name) {
      reject('name is empty');
      continue;
    }

    if (!email) {
      reject('email is empty');
      continue;
    }

    if (!EMAIL_RE.test(email)) {
      reject(`"${email}" is not a valid email address`);
      continue;
    }

    // A duplicate here would fail the `PersonalDetails.email` unique index
    // mid-transaction, taking the whole batch down. Caught up front instead.
    const firstSeen = seenEmails.get(email);
    if (firstSeen !== undefined) {
      reject(`duplicate email, already used on line ${firstSeen}`);
      continue;
    }

    const stream = STREAM_BY_INPUT[rawStream];
    if (!stream) {
      reject(
        `stream "${cell('stream')}" is not recognised (expected Science or Commerce)`,
      );
      continue;
    }

    const language = LANGUAGE_BY_INPUT[rawLanguage];
    if (!language) {
      reject(
        `language "${cell('language')}" is not recognised (expected Kannada, Hindi or Sanskrit)`,
      );
      continue;
    }

    if (!combinationCode) {
      reject('combination is empty');
      continue;
    }

    seenEmails.set(email, line);
    rows.push({
      line,
      name,
      email,
      stream,
      combinationCode,
      language,
    });
  }

  return { rows, errors };
};
