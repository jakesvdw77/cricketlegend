package com.cricketlegend.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "club_financial_admin",
        uniqueConstraints = @UniqueConstraint(columnNames = {"manager_id", "club_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ClubFinancialAdmin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id", nullable = false)
    private Manager manager;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "club_id", nullable = false)
    private Club club;
}
