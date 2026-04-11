package com.cricketlegend.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "manager")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Manager {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long managerId;

    /** Optional: if set, name/surname/phone are sourced from the linked player. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id")
    private Player player;

    /** Used when the manager is not linked to a player. */
    private String name;
    private String surname;

    /** Keycloak login email — always required, used for auth checks. */
    @Column(nullable = false, unique = true)
    private String email;

    /** Used when the manager is not linked to a player. */
    private String phone;
}
