--liquibase formatted sql

--changeset cricketlegend:039-sponsor-print-logo
ALTER TABLE sponsor ADD COLUMN print_logo_url TEXT;
