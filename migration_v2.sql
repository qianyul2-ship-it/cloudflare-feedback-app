-- Migration to Version 2: Update categories
-- Run this after the initial schema migration: wrangler d1 execute feedback-db --remote --file=./migration_v2.sql
--
-- Note: SQLite doesn't support altering CHECK constraints directly.
-- For existing databases, you may need to recreate the table or update existing data.
-- For new deployments, the updated schema.sql already has the correct categories.

-- Update existing records with old category names to new ones
UPDATE feedback 
SET category = CASE 
    WHEN category = 'Feature' THEN 'Feature Request'
    WHEN category = 'Support' THEN 'UX/UI'
    ELSE category
END
WHERE category IN ('Feature', 'Support');

-- Note: The CHECK constraint in the table definition is informational.
-- If you need to enforce it strictly, you would need to recreate the table.
-- However, D1/SQLite will still accept values outside the CHECK constraint.
-- For production, consider adding application-level validation as well.
