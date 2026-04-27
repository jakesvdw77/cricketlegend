package com.cricketlegend.dto;

import com.cricketlegend.domain.enums.EventCategory;
import com.cricketlegend.domain.enums.RecurrenceType;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ClubEventDTO {
    private Long eventId;
    private Long clubId;
    private String clubName;
    private Long teamId;
    private String teamName;
    private EventCategory category;
    private String title;
    private String notes;
    private String eventDate;
    private String startTime;
    private String endTime;
    private String locationName;
    private String googleMapsUrl;
    private String meetingUrl;
    private RecurrenceType recurrence;
    private String recurrenceEndDate;
    private Long seriesId;
    private String createdByName;
}
