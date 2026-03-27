--liquibase formatted sql

--changeset cricketlegend:022-team-selector
ALTER TABLE team ADD COLUMN selector VARCHAR(255);
