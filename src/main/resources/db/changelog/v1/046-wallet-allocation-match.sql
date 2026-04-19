--liquibase formatted sql
--changeset jaco:046-wallet-allocation-match
ALTER TABLE wallet_allocation ADD COLUMN match_id BIGINT;
