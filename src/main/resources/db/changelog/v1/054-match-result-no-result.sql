--liquibase formatted sql

--changeset cricketlegend:054-match-result-no-result
ALTER TABLE match_result ADD COLUMN no_result BOOLEAN NOT NULL DEFAULT FALSE;
