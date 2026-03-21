--liquibase formatted sql

--changeset cricketlegend:014-team-abbreviation
ALTER TABLE team ADD COLUMN abbreviation VARCHAR(10);
