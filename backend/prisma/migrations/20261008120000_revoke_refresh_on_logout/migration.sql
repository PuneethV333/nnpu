ALTER TABLE "RefreshToken"
ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

UPDATE "RefreshToken" AS "refresh"
SET "tokenVersion" = "auth"."tokenVersion"
FROM "Auth" AS "auth"
WHERE "refresh"."authId" = "auth"."authId";
