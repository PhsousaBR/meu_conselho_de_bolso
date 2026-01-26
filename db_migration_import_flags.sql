-- Migration: Add import tracking to income table

ALTER TABLE income 
ADD COLUMN IF NOT EXISTS is_imported BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS import_batch_id TEXT;

-- Index for efficient deletion by year/import status
CREATE INDEX IF NOT EXISTS idx_income_workspace_imported_date 
ON income (workspace_id, is_imported, date);

-- Comment
COMMENT ON COLUMN income.is_imported IS 'Flag identifying records created via CSV import';
