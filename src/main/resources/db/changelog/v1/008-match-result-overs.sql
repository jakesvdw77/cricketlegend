--liquibase formatted sql

--changeset cricketlegend:025-match-result-overs
ALTER TABLE match_result ADD COLUMN overs_batting_first VARCHAR(10);
ALTER TABLE match_result ADD COLUMN overs_batting_second VARCHAR(10);
