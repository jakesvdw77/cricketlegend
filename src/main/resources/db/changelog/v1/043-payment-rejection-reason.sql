--liquibase formatted sql

--changeset cricketlegend:043-payment-rejection-reason
ALTER TABLE payment ADD COLUMN rejection_reason TEXT;
