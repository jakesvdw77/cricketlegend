--liquibase formatted sql

--changeset cricketlegend:041-payment-status
ALTER TABLE payment ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PENDING';
