--liquibase formatted sql

--changeset cricketlegend:001-club
CREATE TABLE IF NOT EXISTS club (
    club_id     BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL
);

--changeset cricketlegend:002-media-content
CREATE TABLE IF NOT EXISTS media_content (
    id  BIGSERIAL PRIMARY KEY,
    url VARCHAR(1000) NOT NULL
);

--changeset cricketlegend:003-field
CREATE TABLE IF NOT EXISTS field (
    field_id        BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    address         VARCHAR(500),
    google_maps_url VARCHAR(1000),
    home_club_id    BIGINT REFERENCES club(club_id)
);

--changeset cricketlegend:004-player
CREATE TABLE IF NOT EXISTS player (
    player_id                    BIGSERIAL PRIMARY KEY,
    name                         VARCHAR(255) NOT NULL,
    surname                      VARCHAR(255) NOT NULL,
    date_of_birth                DATE,
    contact_number               VARCHAR(50),
    email                        VARCHAR(255),
    alternative_contact_number   VARCHAR(50),
    shirt_number                 INTEGER,
    profile_picture_url          VARCHAR(1000),
    batting_stance               VARCHAR(20),
    bowling_arm                  VARCHAR(10),
    bowling_type                 VARCHAR(30),
    wicket_keeper                BOOLEAN DEFAULT FALSE
);

--changeset cricketlegend:005-player-media
CREATE TABLE IF NOT EXISTS player_media (
    player_id BIGINT NOT NULL REFERENCES player(player_id) ON DELETE CASCADE,
    media_id  BIGINT NOT NULL REFERENCES media_content(id) ON DELETE CASCADE,
    PRIMARY KEY (player_id, media_id)
);

--changeset cricketlegend:006-team
CREATE TABLE IF NOT EXISTS team (
    team_id         BIGSERIAL PRIMARY KEY,
    team_name       VARCHAR(255) NOT NULL,
    club_id         BIGINT REFERENCES club(club_id),
    coach           VARCHAR(255),
    manager         VARCHAR(255),
    administrator   VARCHAR(255),
    email           VARCHAR(255),
    contact_number  VARCHAR(50),
    captain_id      BIGINT REFERENCES player(player_id),
    home_field_id   BIGINT REFERENCES field(field_id),
    logo_url        VARCHAR(1000),
    website_url     VARCHAR(1000),
    facebook_url    VARCHAR(1000)
);

--changeset cricketlegend:007-team-media
CREATE TABLE IF NOT EXISTS team_media (
    team_id  BIGINT NOT NULL REFERENCES team(team_id) ON DELETE CASCADE,
    media_id BIGINT NOT NULL REFERENCES media_content(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, media_id)
);

--changeset cricketlegend:008-tournament
CREATE TABLE IF NOT EXISTS tournament (
    tournament_id           BIGSERIAL PRIMARY KEY,
    name                    VARCHAR(255) NOT NULL,
    description             TEXT,
    start_date              DATE,
    end_date                DATE,
    cricket_format          VARCHAR(10),
    banner_url              VARCHAR(1000),
    logo_url                VARCHAR(1000),
    playing_conditions_url  VARCHAR(1000),
    website_link            VARCHAR(1000),
    facebook_link           VARCHAR(1000),
    points_for_win          INTEGER DEFAULT 2,
    points_for_draw         INTEGER DEFAULT 1,
    points_for_no_result    INTEGER DEFAULT 1,
    points_for_bonus        INTEGER DEFAULT 1
);

--changeset cricketlegend:009-tournament-media
CREATE TABLE IF NOT EXISTS tournament_media (
    tournament_id BIGINT NOT NULL REFERENCES tournament(tournament_id) ON DELETE CASCADE,
    media_id      BIGINT NOT NULL REFERENCES media_content(id) ON DELETE CASCADE,
    PRIMARY KEY (tournament_id, media_id)
);

--changeset cricketlegend:010-tournament-pool
CREATE TABLE IF NOT EXISTS tournament_pool (
    pool_id         BIGSERIAL PRIMARY KEY,
    pool_name       VARCHAR(255) NOT NULL,
    tournament_id   BIGINT NOT NULL REFERENCES tournament(tournament_id) ON DELETE CASCADE
);

--changeset cricketlegend:011-tournament-team
CREATE TABLE IF NOT EXISTS tournament_team (
    tournament_team_id  BIGSERIAL PRIMARY KEY,
    pool_id             BIGINT NOT NULL REFERENCES tournament_pool(pool_id) ON DELETE CASCADE,
    team_id             BIGINT NOT NULL REFERENCES team(team_id)
);

--changeset cricketlegend:012-match
CREATE TABLE IF NOT EXISTS match (
    match_id                BIGSERIAL PRIMARY KEY,
    match_date              DATE,
    scheduled_start_time    TIME,
    umpire                  VARCHAR(255),
    home_team_id            BIGINT REFERENCES team(team_id),
    opposition_team_id      BIGINT REFERENCES team(team_id),
    field_id                BIGINT REFERENCES field(field_id),
    tournament_id           BIGINT REFERENCES tournament(tournament_id)
);

--changeset cricketlegend:013-match-result
CREATE TABLE IF NOT EXISTS match_result (
    match_result_id             BIGSERIAL PRIMARY KEY,
    match_id                    BIGINT NOT NULL UNIQUE REFERENCES match(match_id) ON DELETE CASCADE,
    match_completed             BOOLEAN DEFAULT FALSE,
    match_drawn                 BOOLEAN DEFAULT FALSE,
    decided_on_dls              BOOLEAN DEFAULT FALSE,
    won_with_bonus_point        BOOLEAN DEFAULT FALSE,
    winning_team_id             BIGINT REFERENCES team(team_id),
    man_of_match_id             BIGINT REFERENCES player(player_id),
    side_batting_first_id       BIGINT REFERENCES team(team_id),
    score_batting_first         INTEGER,
    wickets_lost_batting_first  INTEGER,
    score_batting_second        INTEGER,
    wickets_lost_batting_second INTEGER,
    match_outcome_description   TEXT,
    score_card                  JSONB
);

--changeset cricketlegend:014-player-result
CREATE TABLE IF NOT EXISTS player_result (
    player_result_id        BIGSERIAL PRIMARY KEY,
    player_id               BIGINT NOT NULL REFERENCES player(player_id),
    match_id                BIGINT NOT NULL REFERENCES match(match_id) ON DELETE CASCADE,
    team_id                 BIGINT NOT NULL REFERENCES team(team_id),
    batting_position        INTEGER,
    score                   INTEGER,
    balls_faced             INTEGER,
    fours_hit               INTEGER,
    sixes_hit               INTEGER,
    dismissed               BOOLEAN DEFAULT FALSE,
    dismissed_by_bowler_id  BIGINT REFERENCES player(player_id),
    dismissal_type          VARCHAR(30),
    overs_bowled            VARCHAR(10),
    wickets                 INTEGER,
    wides                   INTEGER,
    no_balls                INTEGER,
    dots                    INTEGER,
    catches                 INTEGER,
    man_of_match            BOOLEAN DEFAULT FALSE
);

--changeset cricketlegend:015-match-side
CREATE TABLE IF NOT EXISTS match_side (
    match_side_id       BIGSERIAL PRIMARY KEY,
    match_id            BIGINT NOT NULL REFERENCES match(match_id) ON DELETE CASCADE,
    team_id             BIGINT NOT NULL REFERENCES team(team_id),
    twelfth_man_player_id BIGINT
);

--changeset cricketlegend:016-match-side-players
CREATE TABLE IF NOT EXISTS match_side_players (
    match_side_id   BIGINT NOT NULL REFERENCES match_side(match_side_id) ON DELETE CASCADE,
    player_id       BIGINT NOT NULL
);

--changeset cricketlegend:017-indexes
CREATE INDEX IF NOT EXISTS idx_match_tournament ON match(tournament_id);
CREATE INDEX IF NOT EXISTS idx_match_home_team ON match(home_team_id);
CREATE INDEX IF NOT EXISTS idx_match_opposition_team ON match(opposition_team_id);
CREATE INDEX IF NOT EXISTS idx_player_result_player ON player_result(player_id);
CREATE INDEX IF NOT EXISTS idx_player_result_match ON player_result(match_id);
CREATE INDEX IF NOT EXISTS idx_match_side_match ON match_side(match_id);
