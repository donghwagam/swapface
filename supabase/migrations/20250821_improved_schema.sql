-- Improved database schema based on reference architecture
-- This replaces the current face_swap_tasks table with a better state machine

-- Drop existing table if it exists (be careful in production!)
-- DROP TABLE IF EXISTS face_swap_tasks;

-- Create new tasks table with improved state machine
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id text UNIQUE,               -- Provider response task_id
  status text NOT NULL DEFAULT 'queued',  -- queued|processing|succeeded|failed|timeout|cancelled
  source_image text,
  face_image text,
  result_image text,                 -- Result URL from provider
  provider text DEFAULT 'aifaceswap',
  credits_used integer DEFAULT 2,
  error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_tasks_task_id ON tasks (task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks (created_at);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END; 
$$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies - server key only for write/update
CREATE POLICY "service_can_write_tasks" ON tasks
  FOR INSERT TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_can_update_tasks" ON tasks
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- Anonymous/authenticated users can read tasks
CREATE POLICY "users_can_read_tasks" ON tasks
  FOR SELECT TO anon, authenticated USING (true);

-- Migrate existing data from face_swap_tasks if it exists
-- INSERT INTO tasks (task_id, status, source_image, face_image, result_image, credits_used, error, created_at, updated_at)
-- SELECT task_id, 
--        CASE 
--          WHEN status = 'processing' THEN 'processing'
--          WHEN status = 'completed' THEN 'succeeded'
--          WHEN status = 'failed' THEN 'failed'
--          ELSE status
--        END as status,
--        source_image, face_image, result_image, credits_used, error_message, created_at, updated_at
-- FROM face_swap_tasks 
-- ON CONFLICT (task_id) DO NOTHING;