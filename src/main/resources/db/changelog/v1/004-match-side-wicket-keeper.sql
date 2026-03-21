--liquibase formatted sql

--changeset cricketlegend:020-match-side-wicket-keeper
ALTER TABLE match_side
    ADD COLUMN IF NOT EXISTS wicket_keeper_player_id BIGINT;
