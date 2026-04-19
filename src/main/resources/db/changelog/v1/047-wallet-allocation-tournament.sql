--liquibase formatted sql

--changeset cricketlegend:047-wallet-allocation-tournament
ALTER TABLE wallet_allocation ADD COLUMN tournament_id BIGINT;
