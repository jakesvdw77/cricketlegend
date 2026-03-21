--liquibase formatted sql

--changeset cricketlegend:026-sponsor-contact-person
ALTER TABLE sponsor ADD COLUMN contact_person VARCHAR(255);
