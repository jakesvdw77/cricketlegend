--liquibase formatted sql

--changeset cricketlegend:017-player-career-url
ALTER TABLE player ADD COLUMN career_url VARCHAR(1000);