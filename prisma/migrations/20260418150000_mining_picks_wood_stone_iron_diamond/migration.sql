-- Remap legacy pick keys: starter stone→wood, copper→stone, steel→iron, laser→diamond
ALTER TABLE "EconomyUser" ALTER COLUMN "miningPickEquipped" SET DEFAULT 'wood';

UPDATE "EconomyUser" SET "miningPickEquipped" = CASE "miningPickEquipped"
  WHEN 'laser' THEN 'diamond'
  WHEN 'steel' THEN 'iron'
  WHEN 'copper' THEN 'stone'
  WHEN 'stone' THEN 'wood'
  ELSE "miningPickEquipped"
END;

UPDATE "EconomyUser" eu SET "miningPicksOwned" = COALESCE(
  (
    SELECT jsonb_agg(to_jsonb(mapped))
    FROM (
      SELECT CASE elem #>> '{}'
        WHEN 'laser' THEN 'diamond'
        WHEN 'steel' THEN 'iron'
        WHEN 'copper' THEN 'stone'
        WHEN 'stone' THEN 'wood'
        ELSE elem #>> '{}'
      END AS mapped
      FROM jsonb_array_elements(COALESCE(eu."miningPicksOwned", '[]'::jsonb)) AS j(elem)
    ) AS q
  ),
  '["wood"]'::jsonb
);
