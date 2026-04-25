--liquibase formatted sql

--changeset cricketlegend:053-match-result-forfeited
ALTER TABLE match_result ADD COLUMN forfeited BOOLEAN NOT NULL DEFAULT FALSE;
