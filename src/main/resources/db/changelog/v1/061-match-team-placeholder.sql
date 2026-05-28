--liquibase formatted sql

--changeset cricketlegend:061-match-team-placeholder
ALTER TABLE match ADD COLUMN home_team_placeholder VARCHAR(100);
ALTER TABLE match ADD COLUMN away_team_placeholder VARCHAR(100);
