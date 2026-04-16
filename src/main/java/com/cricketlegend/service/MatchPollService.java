package com.cricketlegend.service;

import com.cricketlegend.domain.enums.AvailabilityStatus;
import com.cricketlegend.dto.MatchPollDTO;
import com.cricketlegend.dto.PlayerNotificationDTO;

import java.util.List;

public interface MatchPollService {
    MatchPollDTO togglePoll(Long matchId, Long teamId, boolean open);
    MatchPollDTO getPoll(Long matchId, Long teamId);
    void setMyAvailability(Long matchId, Long teamId, AvailabilityStatus status, String email);
    void setPlayerAvailability(Long matchId, Long teamId, Long playerId, AvailabilityStatus status);
    List<PlayerNotificationDTO> getMyNotifications(String email);
    long countUnreadNotifications(String email);
    void markNotificationRead(Long notificationId, String email);
    void sendManagerNotification(String subject, String message, String managerEmail);
}
