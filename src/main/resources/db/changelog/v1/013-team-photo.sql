--liquibase formatted sql

--changeset cricketlegend:013-team-photo
ALTER TABLE team ADD COLUMN team_photo_url VARCHAR(500);
