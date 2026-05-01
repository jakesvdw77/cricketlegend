--liquibase formatted sql

--changeset cricketlegend:059-match-result-visibility
ALTER TABLE match_result ADD COLUMN result_visibility VARCHAR(50) NOT NULL DEFAULT 'NOT_PUBLISHED';
