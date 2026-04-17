--liquibase formatted sql

--changeset jaco:045-wallet-allocation-year
ALTER TABLE wallet_allocation ADD COLUMN subscription_year INTEGER;
