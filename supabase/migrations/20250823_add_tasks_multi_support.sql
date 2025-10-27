-- Add multi support to tasks table
ALTER TABLE IF EXISTS tasks 
  ADD COLUMN IF NOT EXISTS task_type text CHECK (task_type IN ('single','multi','video')) DEFAULT 'single';

ALTER TABLE IF EXISTS tasks 
  ADD COLUMN IF NOT EXISTS face_images jsonb; -- for multi face swap

-- Indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks (task_type);