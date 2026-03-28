-- user_roles.role uses enum app_role, not a CHECK constraint
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'financeiro';
