--liquibase formatted sql

--changeset cricketlegend:026-player-gender
ALTER TABLE player ADD COLUMN gender VARCHAR(10);
