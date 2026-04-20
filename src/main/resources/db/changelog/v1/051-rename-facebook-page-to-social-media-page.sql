--liquibase formatted sql

--changeset cricketlegend:051-rename-facebook-page-to-social-media-page
ALTER TABLE facebook_page RENAME TO social_media_page;
