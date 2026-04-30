--liquibase formatted sql
--changeset cricketlegend:058-app-settings-match-results
ALTER TABLE app_settings ADD COLUMN show_match_results_section BOOLEAN NOT NULL DEFAULT TRUE;
