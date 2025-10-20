-- Part 1: Add new enum values (must be in separate transaction)
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'waiter';