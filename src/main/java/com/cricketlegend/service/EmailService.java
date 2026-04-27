package com.cricketlegend.service;

public interface EmailService {

    void sendAvailabilityPollEmail(PollEmailData data);

    void sendTeamAnnouncedEmail(TeamAnnouncedEmailData data);

    void sendSquadEmail(SquadEmailData data);

    record PollEmailData(
            String playerEmail,
            String playerName,
            String matchTitle,
            String matchDate,
            String startTime,
            String arrivalTime,
            String tossTime,
            String teamName,
            String venue,
            String venueAddress,
            String mapsUrl,
            String tournament,
            String matchStage,
            String pollUrl
    ) {}

    record SquadPlayer(String name, String role, boolean isCaptain) {}

    record SquadEmailData(
            String playerEmail,
            String playerName,
            String teamName,
            String captainName,
            String coach,
            String manager,
            String homeField,
            java.util.List<SquadPlayer> squad,
            String squadUrl,
            String tournamentName,
            String tournamentLogoUrl,
            String tournamentDates,
            String cricketFormat,
            String ageGroup,
            String tournamentGender,
            String tournamentDescription,
            String websiteLink,
            String facebookLink,
            String instagramLink,
            String youtubeLink,
            String playingConditionsUrl,
            String registrationFee,
            String matchFee
    ) {}

    record TeamAnnouncedEmailData(
            String playerEmail,
            String playerName,
            boolean isCaptain,
            boolean isWicketKeeper,
            boolean isTwelfthMan,
            String matchTitle,
            String matchDate,
            String startTime,
            String arrivalTime,
            String tossTime,
            String teamName,
            String venue,
            String venueAddress,
            String mapsUrl,
            String tournament,
            String matchStage,
            String teamsheetUrl
    ) {}
}
