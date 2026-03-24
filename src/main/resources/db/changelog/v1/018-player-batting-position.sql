--liquibase formatted sql

--changeset cricketlegend:018-player-batting-position
ALTER TABLE player ADD COLUMN batting_position VARCHAR(50);
