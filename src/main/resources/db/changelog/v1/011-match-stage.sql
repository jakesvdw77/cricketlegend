--liquibase formatted sql

--changeset cricketlegend:028-match-stage
ALTER TABLE match ADD COLUMN match_stage VARCHAR(20);
