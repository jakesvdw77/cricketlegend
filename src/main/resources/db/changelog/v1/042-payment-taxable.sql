--liquibase formatted sql

--changeset cricketlegend:042-payment-taxable
ALTER TABLE payment ADD COLUMN taxable BOOLEAN NOT NULL DEFAULT FALSE;
