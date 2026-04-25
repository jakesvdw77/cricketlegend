--liquibase formatted sql

--changeset cricketlegend:052-user-login-events
CREATE TABLE user_login_event (
    login_event_id BIGSERIAL PRIMARY KEY,
    first_name     VARCHAR(100)             NOT NULL,
    last_name      VARCHAR(100)             NOT NULL,
    role           VARCHAR(50)              NOT NULL,
    login_time     TIMESTAMP                NOT NULL
);

CREATE INDEX idx_user_login_event_login_time ON user_login_event (login_time DESC);
