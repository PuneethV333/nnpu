-- Stream-disambiguate `Section.session`.
--
-- `Section` is unique on [classId, session, academicYearId] with no `stream`
-- column, so the stored session value has to carry a stream prefix ("SCI-A" /
-- "COM-A") for Science and Commerce to coexist in one class. EnrollmentService
-- has always done this; OnboardingService stored the plain label, which meant
-- the two paths created *different* sections for the same class and stream and a
-- manually created student could never match an enrollment-created section.
--
-- The stream is not stored on Section (nor on User), so it is derived from the
-- combinations of the section's students. That derivation is only valid when it
-- is unambiguous, so every ambiguity aborts the migration instead of guessing.

DO $$
DECLARE
    ambiguous int;
BEGIN
    -- 1. Sections with no student carrying a combination: stream unknowable.
    SELECT count(*) INTO ambiguous
    FROM "Section" s
    WHERE s.session NOT LIKE 'SCI-%'
      AND s.session NOT LIKE 'COM-%'
      AND NOT EXISTS (
          SELECT 1
          FROM "User" u
          JOIN "Combination" c ON c.id = u."combinationId"
          WHERE u."sectionId" = s.id
            AND u.role = 'Student'
      );

    IF ambiguous > 0 THEN
        RAISE EXCEPTION
            'Cannot migrate: % section(s) have no student with a combination, so the stream cannot be derived. Prefix their session value by hand.', ambiguous;
    END IF;

    -- 2. Sections whose students span more than one stream: contradictory.
    SELECT count(*) INTO ambiguous
    FROM "Section" s
    WHERE s.session NOT LIKE 'SCI-%'
      AND s.session NOT LIKE 'COM-%'
      AND 1 < (
          SELECT count(DISTINCT c.stream)
          FROM "User" u
          JOIN "Combination" c ON c.id = u."combinationId"
          WHERE u."sectionId" = s.id
            AND u.role = 'Student'
      );

    IF ambiguous > 0 THEN
        RAISE EXCEPTION
            'Cannot migrate: % section(s) contain students from more than one stream. Resolve them before prefixing.', ambiguous;
    END IF;

    -- 3. Prefixing would violate @@unique([classId, session, academicYearId]),
    --    i.e. an enrollment-created section already holds the target value.
    SELECT count(*) INTO ambiguous
    FROM "Section" src
    JOIN "Class" cl ON cl.id = src."classId"
    JOIN "Section" dst
      ON dst."classId" = src."classId"
     AND dst."academicYearId" = src."academicYearId"
     AND dst.session = CASE (
            SELECT c.stream
            FROM "User" u
            JOIN "Combination" c ON c.id = u."combinationId"
            WHERE u."sectionId" = src.id
              AND u.role = 'Student'
            LIMIT 1
         )
         WHEN 'Science' THEN 'SCI-' || src.session
         ELSE 'COM-' || src.session
     END
    WHERE src.session NOT LIKE 'SCI-%'
      AND src.session NOT LIKE 'COM-%'
      AND dst.id <> src.id;

    IF ambiguous > 0 THEN
        RAISE EXCEPTION
            'Cannot migrate: % section(s) would collide with an existing prefixed section on [classId, session, academicYearId]. Merge or remove the duplicates first.', ambiguous;
    END IF;
END
$$;

-- Safe by the guards above: exactly one stream per section, no collisions, and
-- already-prefixed rows are skipped, so re-running is a no-op.
UPDATE "Section" s
SET session = CASE stream.stream
    WHEN 'Science' THEN 'SCI-' || s.session
    ELSE 'COM-' || s.session
END
FROM (
    SELECT DISTINCT ON (u."sectionId")
        u."sectionId" AS section_id,
        c.stream
    FROM "User" u
    JOIN "Combination" c ON c.id = u."combinationId"
    WHERE u.role = 'Student'
    ORDER BY u."sectionId", c.stream
) AS stream
WHERE s.id = stream.section_id
  AND s.session NOT LIKE 'SCI-%'
  AND s.session NOT LIKE 'COM-%';

-- `Section.name` is `${className}-${session}` in every write path, so it has to
-- move with the session value or the two disagree (enrollment already produced
-- "1-SCI-A" while onboarding produced "1-A"). Runs after the UPDATE above, so
-- the new session value is already in place.
UPDATE "Section" s
SET name = cl.name || '-' || s.session
FROM "Class" cl
WHERE cl.id = s."classId"
  AND s.name <> cl.name || '-' || s.session;
