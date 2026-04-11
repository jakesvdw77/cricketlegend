--liquibase formatted sql

--changeset cricketlegend:035-sponsor-company-fields
ALTER TABLE sponsor ADD COLUMN address TEXT;
ALTER TABLE sponsor ADD COLUMN vat_number VARCHAR(50);
ALTER TABLE sponsor ADD COLUMN registration_number VARCHAR(50);
