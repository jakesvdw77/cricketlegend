--liquibase formatted sql

--changeset jaco:044-wallet-allocation
CREATE TABLE wallet_allocation (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT NOT NULL REFERENCES player(player_id),
    amount DECIMAL(12, 2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    allocation_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
