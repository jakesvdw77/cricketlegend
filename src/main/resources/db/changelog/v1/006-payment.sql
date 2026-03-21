--liquibase formatted sql

--changeset cricketlegend:023-create-payment
CREATE TABLE payment (
    payment_id           BIGSERIAL    PRIMARY KEY,
    payment_type         VARCHAR(20)  NOT NULL,
    payment_category     VARCHAR(30),
    player_id            BIGINT       REFERENCES player(player_id),
    sponsor_id           BIGINT       REFERENCES sponsor(sponsor_id),
    tournament_id        BIGINT       REFERENCES tournament(tournament_id),
    payment_date         DATE         NOT NULL,
    amount               NUMERIC(12, 2) NOT NULL,
    description          TEXT,
    proof_of_payment_url VARCHAR(500),
    created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
