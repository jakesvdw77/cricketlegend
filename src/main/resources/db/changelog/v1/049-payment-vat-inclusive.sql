--liquibase formatted sql

--changeset cricketlegend:049-payment-vat-inclusive
ALTER TABLE payment ADD COLUMN vat_inclusive BOOLEAN NOT NULL DEFAULT FALSE;
