WITH RECURSIVE find_masks(id, parent) AS (
    SELECT m.id, m.parent FROM "Mask" m WHERE m.id = $1
    UNION ALL
    SELECT s.id, s.parent FROM "Mask" s, find_masks f
    WHERE f.parent = s.id
)
SELECT distinct on (state.path) state.path, state.values FROM find_masks
    JOIN "State" state ON state."maskId" = find_masks.id
WHERE state.path = ANY($2)
ORDER BY state.path, state."maskId" DESC;