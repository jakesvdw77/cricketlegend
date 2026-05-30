--liquibase formatted sql

--changeset cricketlegend:063-mail-settings
CREATE TABLE mail_settings (
    id        BIGINT       PRIMARY KEY DEFAULT 1,
    smtp_host VARCHAR(255),
    smtp_port INTEGER      NOT NULL DEFAULT 587,
    username  VARCHAR(255),
    password  VARCHAR(255)
);

INSERT INTO mail_settings (id, smtp_host, smtp_port, username, password)
VALUES (1, 'smtp.gmail.com', 587, NULL, NULL);
