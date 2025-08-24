-- Backfill legacy face_swap_tasks into unified tasks table
-- Map legacy statuses to new statuses

INSERT INTO tasks (task_id, status, source_image, face_image, result_image, credits_used, error, created_at, updated_at)
SELECT 
  fst.task_id,
  CASE 
    WHEN fst.status = 'processing' THEN 'processing'
    WHEN fst.status = 'completed' THEN 'succeeded'
    WHEN fst.status = 'failed' THEN 'failed'
    ELSE COALESCE(fst.status, 'processing')
  END AS status,
  fst.source_image,
  fst.face_image,
  fst.result_image,
  COALESCE(fst.credits_used, 2) AS credits_used,
  fst.error_message AS error,
  fst.created_at,
  fst.updated_at
FROM face_swap_tasks fst
ON CONFLICT (task_id) DO NOTHING;

-- Optional: after validation, you may drop legacy table
-- DROP TABLE IF EXISTS face_swap_tasks;