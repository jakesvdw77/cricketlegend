--liquibase formatted sql

--changeset cricketlegend:020-player-part-time-bowler
ALTER TABLE player ADD COLUMN part_time_bowler BOOLEAN DEFAULT FALSE;
