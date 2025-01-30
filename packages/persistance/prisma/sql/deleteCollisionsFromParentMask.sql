/*
 DELETE PATHS FROM PARENT MASK

 Strategy on this query:
 1. Find the mask we are interested in, as a record with the id and it's parent id
 2. Select all paths that exist on that mask
 3. Delete all records whose mask is the parent of (1), and whose path is contained in (2)
 */

WITH mask AS (
    SELECT id, parent FROM "Mask" m WHERE m.id = $1),
paths AS (
    SELECT path FROM "State" s
    JOIN mask m on s."maskId" = m.id
 )
DELETE FROM "State" s
    WHERE s."maskId" IN (SELECT parent FROM mask)
        AND s.path IN (SELECT path FROM paths)