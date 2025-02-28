import { Prisma } from "@prisma/client";

/*
Strategy:
 1. Find the mask we are interested in, as a record with the id and it's parent id
 2. Update the maskId to the masks parent for all the entries of that particular mask
*/

export function mergeIntoParent(maskId: number) {
  return Prisma.sql`
    WITH mask AS (
        SELECT id, parent FROM "Mask" m WHERE m.id = ${maskId})
    UPDATE "State" SET "maskId" = (SELECT parent FROM mask)
    WHERE "maskId" = (SELECT id FROM mask)
  `;
}
