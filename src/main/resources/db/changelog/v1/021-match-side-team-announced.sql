--liquibase formatted sql

--changeset cricketlegend:021-match-side-team-announced
ALTER TABLE match_side ADD COLUMN team_announced BOOLEAN DEFAULT FALSE;
