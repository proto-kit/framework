/*
Strategy:
 1. Find the mask we are interested in, as a record with the id and it's parent id
 2. Update the maskId to the masks parent for all the entries of that particular mask
*/

WITH mask AS (
    SELECT id, parent FROM "Mask" m WHERE m.id = $1)
UPDATE "State" SET "maskId" = (SELECT parent FROM mask)
WHERE "maskId" = (SELECT id FROM mask)