import { parseStudentCsv, type StudentCsvRow } from './parse-student-csv';

const HEADER = 'name,email,stream,combination,language';

const codesOf = (rows: StudentCsvRow[]) => rows.map((r) => r.combinationCode);

describe('parseStudentCsv', () => {
  it('parses a well-formed roster', () => {
    const { rows, errors } = parseStudentCsv(
      [
        HEADER,
        'Ananya Rao,ananya@example.com,Science,PCMB,Kannada',
        'Rahul Kumar,rahul@example.com,Commerce,CEBA,Hindi',
      ].join('\n'),
    );

    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      line: 2,
      name: 'Ananya Rao',
      email: 'ananya@example.com',
      stream: 'Science',
      combinationCode: 'PCMB',
      language: 'Kannada',
    });
    expect(codesOf(rows)).toEqual(['PCMB', 'CEBA']);
  });

  it('is case-insensitive for stream, combination and language', () => {
    // A spreadsheet will hand back any casing of the same column value.
    const { rows, errors } = parseStudentCsv(
      `${HEADER}\nAnanya,ananya@example.com,science,pcmb,sanskrit`,
    );

    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({
      stream: 'Science',
      combinationCode: 'PCMB',
      language: 'Sanskrit',
    });
  });

  it('lower-cases emails so uniqueness checks are not case-sensitive', () => {
    const { rows } = parseStudentCsv(
      `${HEADER}\nAnanya,Ananya@Example.COM,Science,PCMB,Kannada`,
    );

    expect(rows[0].email).toBe('ananya@example.com');
  });

  it('keeps commas inside a quoted name', () => {
    const { rows, errors } = parseStudentCsv(
      `${HEADER}\n"Rao, Ananya",ananya@example.com,Science,PCMB,Kannada`,
    );

    expect(errors).toEqual([]);
    expect(rows[0].name).toBe('Rao, Ananya');
  });

  it('handles an escaped double quote inside a quoted field', () => {
    const { rows } = parseStudentCsv(
      `${HEADER}\n"Rao ""Annie"" A",ananya@example.com,Science,PCMB,Kannada`,
    );

    expect(rows[0].name).toBe('Rao "Annie" A');
  });

  it('strips a UTF-8 BOM, as written by Excel', () => {
    const { rows, errors } = parseStudentCsv(
      `\uFEFF${HEADER}\nAnanya,ananya@example.com,Science,PCMB,Kannada`,
    );

    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
  });

  it('accepts CRLF line endings', () => {
    const { rows, errors } = parseStudentCsv(
      `${HEADER}\r\nAnanya,ananya@example.com,Science,PCMB,Kannada\r\nRahul,rahul@example.com,Commerce,CEBA,Hindi`,
    );

    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
  });

  it('ignores blank lines without shifting reported line numbers', () => {
    const { rows, errors } = parseStudentCsv(
      `${HEADER}\n\nAnanya,ananya@example.com,Science,PCMB,Kannada\n\n`,
    );

    expect(errors).toEqual([]);
    // Header is line 1, blank line 2, so the student really is on line 3.
    expect(rows[0].line).toBe(3);
  });

  it('rejects a file missing a required column, naming it', () => {
    expect(() =>
      parseStudentCsv('name,email,stream,combination\nA,a@b.com,Science,PCMB'),
    ).toThrow(/missing required column\(s\): language/i);
  });

  it('rejects an empty file', () => {
    expect(() => parseStudentCsv('')).toThrow(/empty/i);
    expect(() => parseStudentCsv('\n\n  \n')).toThrow(/empty/i);
  });

  it('rejects an invalid email rather than creating an undeliverable account', () => {
    const { rows, errors } = parseStudentCsv(
      `${HEADER}\nAnanya,not-an-email,Science,PCMB,Kannada`,
    );

    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toMatch(/not a valid email/i);
  });

  it('rejects a duplicate email within the same file', () => {
    // Without this the import would hit the unique index mid-transaction and
    // abort with a P2002 naming only one of the two offending rows.
    const { rows, errors } = parseStudentCsv(
      [
        HEADER,
        'Ananya,ananya@example.com,Science,PCMB,Kannada',
        'Ananya Again,ANANYA@example.com,Science,PCMB,Kannada',
      ].join('\n'),
    );

    expect(rows).toHaveLength(1);
    expect(errors[0].reason).toMatch(
      /duplicate email, already used on line 2/i,
    );
  });

  it('rejects an unrecognised stream or language by name', () => {
    const { rows, errors } = parseStudentCsv(
      `${HEADER}\nA,not-an-email,Science,PCMB,Kannada\nB,rahul@example.com,Arts,CEBA,Hindi\nC,priya@example.com,Science,PCMB,Tamil`,
    );

    expect(rows).toEqual([]);
    expect(errors.map((e) => e.reason)).toEqual([
      expect.stringMatching(/not a valid email/i),
      expect.stringMatching(/stream "Arts" is not recognised/i),
      expect.stringMatching(/language "Tamil" is not recognised/i),
    ]);
  });

  it('rejects an empty required cell', () => {
    const { rows, errors } = parseStudentCsv(
      [
        HEADER,
        ',ananya@example.com,Science,PCMB,Kannada',
        'Rahul,,Commerce,CEBA,Hindi',
        'Priya,priya@example.com,Science,,Kannada',
      ].join('\n'),
    );

    expect(rows).toEqual([]);
    expect(errors.map((e) => e.reason)).toEqual([
      'name is empty',
      'email is empty',
      'combination is empty',
    ]);
  });

  it('reports the true line number for a bad row in the middle of the file', () => {
    const { errors } = parseStudentCsv(
      [
        HEADER,
        'Ananya,ananya@example.com,Science,PCMB,Kannada',
        'Rahul,nope,Commerce,CEBA,Hindi',
        'Priya,priya@example.com,Science,PCMB,Kannada',
      ].join('\n'),
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(3);
  });

  it('tolerates extra columns and reordered headers', () => {
    const { rows, errors } = parseStudentCsv(
      'language,combination,stream,email,name,phone\nHindi,CEBA,Commerce,rahul@example.com,Rahul Kumar,999',
    );

    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({
      name: 'Rahul Kumar',
      email: 'rahul@example.com',
      combinationCode: 'CEBA',
    });
  });

  it('does not require the combination to exist — the service resolves that', () => {
    // Parsing stays about shape and format; whether a combination is real
    // depends on the DB, so it is the service's job and its error message can
    // then distinguish "wrong stream" from "does not exist".
    const { rows } = parseStudentCsv(
      `${HEADER}\nAnanya,ananya@example.com,Science,ZZZZ,Kannada`,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].combinationCode).toBe('ZZZZ');
  });
});
