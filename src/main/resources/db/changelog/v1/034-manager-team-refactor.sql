--liquibase formatted sql

--changeset cricketlegend:034-manager-team-refactor
-- Migrate existing email-based rows into the manager table
INSERT INTO manager (email, name, surname)
SELECT DISTINCT manager_email, manager_email, ''
FROM manager_team
ON CONFLICT (email) DO NOTHING;

-- Add the new FK column
ALTER TABLE manager_team ADD COLUMN manager_id BIGINT REFERENCES manager(manager_id) ON DELETE CASCADE;

-- Back-fill it from the email lookup
UPDATE manager_team mt
SET manager_id = m.manager_id
FROM manager m
WHERE mt.manager_email = m.email;

-- Enforce NOT NULL now that it is populated
ALTER TABLE manager_team ALTER COLUMN manager_id SET NOT NULL;

-- Replace old unique constraint and column
ALTER TABLE manager_team DROP CONSTRAINT uq_manager_team;
ALTER TABLE manager_team DROP COLUMN manager_email;
ALTER TABLE manager_team ADD CONSTRAINT uq_manager_team UNIQUE (manager_id, team_id);

DROP INDEX IF EXISTS idx_manager_team_email;
CREATE INDEX idx_manager_team_manager ON manager_team(manager_id);
