--liquibase formatted sql

--changeset cricketlegend:016-match-scoring-url
ALTER TABLE match ADD COLUMN scoring_url VARCHAR(500);
