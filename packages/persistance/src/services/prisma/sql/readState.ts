import { Prisma } from "@prisma/client";

export function readState(maskId: number, paths: Prisma.Decimal[]) {
  return Prisma.sql`
    WITH RECURSIVE find_masks(id, parent) AS (
        SELECT m.id, m.parent FROM "Mask" m WHERE m.id = ${maskId}
        UNION ALL
        SELECT s.id, s.parent FROM "Mask" s, find_masks f
        WHERE f.parent = s.id
    )
    SELECT distinct on (state.path) state.path, state.values FROM find_masks
        JOIN "State" state ON state."maskId" = find_masks.id
    WHERE state.path = ANY(${paths})
    ORDER BY state.path, state."maskId" DESC;
  `;
}
