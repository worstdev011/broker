-- Convert display_id from SERIAL (sequence) to plain INTEGER
-- and assign random 7-digit unique IDs to all existing users.

-- Step 1: Drop the sequence default so new rows won't auto-increment
ALTER TABLE "users" ALTER COLUMN "display_id" DROP DEFAULT;

-- Step 2: Drop the sequence that was created by SERIAL
DROP SEQUENCE IF EXISTS "users_display_id_seq";

-- Step 3: Randomize existing users' display_id values to 7-digit numbers.
-- We use a DO block to iterate and resolve collisions.
DO $$
DECLARE
  rec RECORD;
  new_id INT;
BEGIN
  FOR rec IN SELECT id FROM users ORDER BY "createdAt" LOOP
    LOOP
      -- Random 7-digit number: 1000000 to 9999999
      new_id := floor(random() * 9000000 + 1000000)::INT;
      -- Exit loop if not already taken
      EXIT WHEN NOT EXISTS (SELECT 1 FROM users WHERE display_id = new_id AND id != rec.id);
    END LOOP;
    UPDATE users SET display_id = new_id WHERE id = rec.id;
  END LOOP;
END;
$$;
