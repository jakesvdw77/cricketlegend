--liquibase formatted sql

--changeset cricketlegend:023-player-clothing-size
ALTER TABLE player ADD COLUMN shirt_size VARCHAR(10);
ALTER TABLE player ADD COLUMN pant_size VARCHAR(10);
