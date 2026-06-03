--liquibase formatted sql

--changeset cricketlegend:067-user-login-event-email
ALTER TABLE user_login_event ADD COLUMN email VARCHAR(255);

CREATE INDEX idx_user_login_event_email ON user_login_event (email);
