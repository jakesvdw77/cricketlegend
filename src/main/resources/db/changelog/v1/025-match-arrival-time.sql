--liquibase formatted sql

--changeset cricketlegend:025-match-arrival-time
ALTER TABLE match ADD COLUMN arrival_time TIME;
