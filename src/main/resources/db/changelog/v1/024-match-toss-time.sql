--liquibase formatted sql

--changeset cricketlegend:024-match-toss-time
ALTER TABLE match ADD COLUMN toss_time TIME;
