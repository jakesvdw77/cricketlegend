package com.cricketlegend.repository;

import com.cricketlegend.domain.ClubEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface ClubEventRepository extends JpaRepository<ClubEvent, Long> {

    List<ClubEvent> findByClubClubIdOrderByEventDateAscStartTimeAsc(Long clubId);

    @Query("""
        SELECT e FROM ClubEvent e
        WHERE e.club.clubId = :clubId
          AND e.eventDate >= :from
        ORDER BY e.eventDate ASC, e.startTime ASC
    """)
    List<ClubEvent> findUpcomingByClub(@Param("clubId") Long clubId, @Param("from") LocalDate from);

    @Query("""
        SELECT e FROM ClubEvent e
        WHERE e.club.clubId = :clubId
          AND (e.team IS NULL OR e.team.teamId = :teamId)
          AND e.eventDate >= :from
        ORDER BY e.eventDate ASC, e.startTime ASC
    """)
    List<ClubEvent> findForPlayer(@Param("clubId") Long clubId,
                                  @Param("teamId") Long teamId,
                                  @Param("from") LocalDate from);

    @Query("""
        SELECT e FROM ClubEvent e
        WHERE e.club.clubId = :clubId
          AND e.team IS NULL
          AND e.eventDate >= :from
        ORDER BY e.eventDate ASC, e.startTime ASC
    """)
    List<ClubEvent> findClubWideFrom(@Param("clubId") Long clubId, @Param("from") LocalDate from);

    List<ClubEvent> findBySeriesId(Long seriesId);
}
