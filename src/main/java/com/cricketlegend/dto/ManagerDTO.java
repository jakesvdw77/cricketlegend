package com.cricketlegend.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ManagerDTO {
    private Long managerId;

    /** Set when the manager is linked to a player. */
    private Long playerId;
    private String playerDisplayName;

    /** Used when the manager is not linked to a player. */
    private String name;
    private String surname;

    /** Keycloak login email — always required. */
    private String email;

    /** Phone: from player.contactNumber when linked, otherwise from manager.phone. */
    private String phone;

    /** Resolved display name: player name when linked, otherwise name + surname. */
    private String displayName;
}
