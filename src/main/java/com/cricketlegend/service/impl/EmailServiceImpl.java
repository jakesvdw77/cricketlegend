package com.cricketlegend.service.impl;

import com.cricketlegend.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromAddress;

    @Async
    @Override
    public void sendSquadEmail(SquadEmailData data) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress, "Cricket Legend");
            helper.setTo(data.playerEmail());
            helper.setSubject("Squad Announcement — " + data.teamName()
                    + (data.tournamentName() != null ? " | " + data.tournamentName() : ""));
            helper.setText(buildSquadHtml(data), true);
            mailSender.send(message);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Failed to send squad email to {}: {}", data.playerEmail(), e.getMessage());
        }
    }

    @Async
    @Override
    public void sendTeamAnnouncedEmail(TeamAnnouncedEmailData data) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress, "Cricket Legend");
            helper.setTo(data.playerEmail());
            helper.setSubject("You've Made the Team! " + data.matchTitle());
            helper.setText(buildTeamAnnouncedHtml(data), true);

            mailSender.send(message);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Failed to send team announced email to {}: {}", data.playerEmail(), e.getMessage());
        }
    }

    @Async
    @Override
    public void sendAvailabilityPollEmail(PollEmailData data) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress, "Cricket Legend");
            helper.setTo(data.playerEmail());
            helper.setSubject("Availability Poll: " + data.matchTitle());
            helper.setText(buildHtml(data), true);

            mailSender.send(message);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Failed to send availability poll email to {}: {}", data.playerEmail(), e.getMessage());
        }
    }

    private String buildSquadHtml(SquadEmailData d) {
        // Tournament section
        StringBuilder tournamentBlock = new StringBuilder();
        if (d.tournamentName() != null) {
            tournamentBlock.append("<div style=\"background-color:#e8f5e9;border-left:4px solid #2e7d32;border-radius:4px;padding:16px 20px;margin-bottom:28px;\">");
            if (d.tournamentLogoUrl() != null && !d.tournamentLogoUrl().isBlank()) {
                tournamentBlock.append("<div style=\"margin-bottom:12px;\">")
                        .append("<img src=\"").append(d.tournamentLogoUrl()).append("\" alt=\"").append(d.tournamentName())
                        .append("\" style=\"max-width:180px;max-height:72px;object-fit:contain;\"/></div>");
            }
            tournamentBlock.append("<div style=\"font-size:16px;font-weight:700;color:#1b5e20;\">&#127942; ").append(d.tournamentName()).append("</div>");
            if (d.tournamentDates() != null)
                tournamentBlock.append("<div style=\"font-size:13px;color:#555555;margin-top:4px;\">&#128197; ").append(d.tournamentDates()).append("</div>");
            if (d.cricketFormat() != null)
                tournamentBlock.append("<div style=\"font-size:13px;color:#555555;margin-top:2px;\">&#127919; Format: ").append(d.cricketFormat()).append("</div>");
            if (d.ageGroup() != null)
                tournamentBlock.append("<div style=\"font-size:13px;color:#555555;margin-top:2px;\">&#128101; Age Group: ").append(d.ageGroup()).append("</div>");
            if (d.tournamentGender() != null)
                tournamentBlock.append("<div style=\"font-size:13px;color:#555555;margin-top:2px;\">Category: ").append(d.tournamentGender()).append("</div>");
            if (d.tournamentDescription() != null && !d.tournamentDescription().isBlank())
                tournamentBlock.append("<div style=\"font-size:13px;color:#555555;margin-top:8px;line-height:1.5;\">").append(d.tournamentDescription()).append("</div>");
            if (d.registrationFee() != null || d.matchFee() != null) {
                tournamentBlock.append("<div style=\"margin-top:8px;\">");
                if (d.registrationFee() != null)
                    tournamentBlock.append("<span style=\"font-size:12px;color:#888888;margin-right:16px;\">Registration Fee: <strong>").append(d.registrationFee()).append("</strong></span>");
                if (d.matchFee() != null)
                    tournamentBlock.append("<span style=\"font-size:12px;color:#888888;\">Match Fee: <strong>").append(d.matchFee()).append("</strong></span>");
                tournamentBlock.append("</div>");
            }
            // Website + playing conditions links
            StringBuilder links = new StringBuilder();
            if (d.websiteLink() != null && !d.websiteLink().isBlank())
                links.append("<a href=\"").append(d.websiteLink()).append("\" style=\"color:#2e7d32;font-size:13px;margin-right:16px;text-decoration:none;\">&#127758; Tournament Website</a>");
            if (d.playingConditionsUrl() != null && !d.playingConditionsUrl().isBlank())
                links.append("<a href=\"").append(d.playingConditionsUrl()).append("\" style=\"color:#2e7d32;font-size:13px;text-decoration:none;\">&#128203; Playing Conditions</a>");
            if (!links.isEmpty())
                tournamentBlock.append("<div style=\"margin-top:10px;\">").append(links).append("</div>");
            // Social media icon links
            StringBuilder social = new StringBuilder();
            if (d.facebookLink() != null && !d.facebookLink().isBlank())
                social.append("<a href=\"").append(d.facebookLink())
                        .append("\" style=\"display:inline-block;background-color:#1877f2;color:#ffffff;font-size:12px;font-weight:600;text-decoration:none;padding:5px 12px;border-radius:4px;margin-right:8px;\">Facebook</a>");
            if (d.instagramLink() != null && !d.instagramLink().isBlank())
                social.append("<a href=\"").append(d.instagramLink())
                        .append("\" style=\"display:inline-block;background-color:#e1306c;color:#ffffff;font-size:12px;font-weight:600;text-decoration:none;padding:5px 12px;border-radius:4px;margin-right:8px;\">Instagram</a>");
            if (d.youtubeLink() != null && !d.youtubeLink().isBlank())
                social.append("<a href=\"").append(d.youtubeLink())
                        .append("\" style=\"display:inline-block;background-color:#ff0000;color:#ffffff;font-size:12px;font-weight:600;text-decoration:none;padding:5px 12px;border-radius:4px;\">YouTube</a>");
            if (!social.isEmpty())
                tournamentBlock.append("<div style=\"margin-top:12px;\">").append(social).append("</div>");
            tournamentBlock.append("</div>");
        }

        // Team info row
        StringBuilder teamInfo = new StringBuilder();
        if (d.captainName() != null)
            teamInfo.append("<div style=\"font-size:13px;color:#c8e6c9;margin-top:4px;\">&#11088; Captain: <strong style=\"color:#ffffff;\">").append(d.captainName()).append("</strong></div>");
        if (d.coach() != null && !d.coach().isBlank())
            teamInfo.append("<div style=\"font-size:13px;color:#c8e6c9;margin-top:2px;\">Coach: ").append(d.coach()).append("</div>");
        if (d.manager() != null && !d.manager().isBlank())
            teamInfo.append("<div style=\"font-size:13px;color:#c8e6c9;margin-top:2px;\">Manager: ").append(d.manager()).append("</div>");
        if (d.homeField() != null && !d.homeField().isBlank())
            teamInfo.append("<div style=\"font-size:13px;color:#c8e6c9;margin-top:2px;\">&#127967; Home Ground: ").append(d.homeField()).append("</div>");

        // Squad rows
        StringBuilder squadRows = new StringBuilder();
        for (int i = 0; i < d.squad().size(); i++) {
            var p = d.squad().get(i);
            String bg = i % 2 == 0 ? "#f9f9f9" : "#ffffff";
            squadRows.append("<tr style=\"background-color:").append(bg).append(";\">")
                    .append("<td style=\"padding:6px 10px;font-size:14px;color:#555555;\">").append(i + 1).append("</td>")
                    .append("<td style=\"padding:6px 10px;font-size:14px;color:#222222;font-weight:").append(p.isCaptain() ? "700" : "400").append(";\">")
                    .append(p.name())
                    .append(p.isCaptain() ? " <span style=\"color:#f9a825;font-size:12px;\">(C)</span>" : "")
                    .append("</td>")
                    .append("<td style=\"padding:6px 10px;font-size:14px;color:#555555;\">").append(p.role() != null ? p.role() : "").append("</td>")
                    .append("</tr>");
        }

        // View Squad CTA (only if URL is present)
        String squadCta = d.squadUrl() != null && !d.squadUrl().isBlank()
                ? """
                  <!-- View Squad CTA -->
                  <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                    <tr>
                      <td align="center">
                        <a href="%s"
                           style="display:inline-block;background-color:#2e7d32;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:6px;letter-spacing:0.5px;">
                          View Full Squad &#8594;
                        </a>
                      </td>
                    </tr>
                  </table>
                  """.formatted(d.squadUrl())
                : "";

        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8"/>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                  <title>Squad Announcement</title>
                </head>
                <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:32px 0;">
                    <tr>
                      <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%%;">

                          <!-- Header -->
                          <tr>
                            <td style="background-color:#1b5e20;border-radius:8px 8px 0 0;padding:32px 40px;text-align:center;">
                              <div style="color:#ffffff;font-size:28px;font-weight:700;letter-spacing:1px;">&#127951; Cricket Legend</div>
                              <div style="color:#a5d6a7;font-size:14px;margin-top:6px;letter-spacing:2px;text-transform:uppercase;">Squad Announcement</div>
                            </td>
                          </tr>

                          <!-- Team banner -->
                          <tr>
                            <td style="background-color:#2e7d32;padding:16px 40px;">
                              <div style="color:#ffffff;font-size:20px;font-weight:700;">%s</div>
                              %s
                            </td>
                          </tr>

                          <!-- Body -->
                          <tr>
                            <td style="background-color:#ffffff;padding:32px 40px;">

                              <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">
                                Hi <strong>%s</strong>, you have been selected in the squad. Below are the full details.
                              </p>

                              %s

                              <!-- Squad table -->
                              <table width="100%%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:28px;border-radius:6px;overflow:hidden;">
                                <thead>
                                  <tr style="background-color:#1b5e20;">
                                    <th style="padding:8px 10px;color:#ffffff;font-size:12px;text-align:left;width:32px;">#</th>
                                    <th style="padding:8px 10px;color:#ffffff;font-size:12px;text-align:left;">Player</th>
                                    <th style="padding:8px 10px;color:#ffffff;font-size:12px;text-align:left;">Role</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  %s
                                </tbody>
                              </table>

                              %s

                              <!-- Divider -->
                              <hr style="border:none;border-top:1px solid #e0e0e0;margin-bottom:24px;"/>
                              <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:1.6;">
                                Good luck this season! This email was sent because you opted in to Cricket Legend email notifications.<br/>
                                To unsubscribe, update your notification preferences in the app.
                              </p>
                            </td>
                          </tr>

                          <!-- Footer -->
                          <tr>
                            <td style="background-color:#f4f6f8;border-radius:0 0 8px 8px;padding:20px 40px;text-align:center;border-top:1px solid #e0e0e0;">
                              <p style="margin:0;font-size:12px;color:#aaaaaa;">&#127951; Cricket Legend &mdash; Powered by passion for the game</p>
                            </td>
                          </tr>

                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(
                d.teamName(),
                teamInfo.toString(),
                d.playerName(),
                tournamentBlock.toString(),
                squadRows.toString(),
                squadCta
        );
    }

    private String buildTeamAnnouncedHtml(TeamAnnouncedEmailData d) {
        // Role badge(s)
        StringBuilder roles = new StringBuilder();
        if (d.isCaptain())       roles.append("<span style=\"display:inline-block;background-color:#f9a825;color:#ffffff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:12px;margin-right:6px;\">&#127941; Captain</span>");
        if (d.isWicketKeeper())  roles.append("<span style=\"display:inline-block;background-color:#1565c0;color:#ffffff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:12px;margin-right:6px;\">&#129354; Wicket Keeper</span>");
        if (d.isTwelfthMan())    roles.append("<span style=\"display:inline-block;background-color:#6a1b9a;color:#ffffff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:12px;margin-right:6px;\">12th Man</span>");

        String tournamentLine = d.tournament() != null
                ? "<div style=\"font-size:13px;color:#4caf50;margin-top:4px;\">"
                  + d.tournament()
                  + (d.matchStage() != null && !d.matchStage().isBlank() ? " &bull; " + d.matchStage() : "")
                  + "</div>"
                : (d.matchStage() != null && !d.matchStage().isBlank()
                  ? "<div style=\"font-size:13px;color:#4caf50;margin-top:4px;\">" + d.matchStage() + "</div>"
                  : "");

        String venueAddressHtml = d.venueAddress() != null && !d.venueAddress().isBlank()
                ? "<div style=\"font-size:13px;color:#666666;margin-top:2px;\">"
                  + (d.mapsUrl() != null
                    ? "<a href=\"" + d.mapsUrl() + "\" style=\"color:#2e7d32;text-decoration:none;\">&#128205; " + d.venueAddress() + "</a>"
                    : d.venueAddress())
                  + "</div>"
                : (d.mapsUrl() != null
                  ? "<div style=\"font-size:13px;margin-top:2px;\"><a href=\"" + d.mapsUrl() + "\" style=\"color:#2e7d32;text-decoration:none;\">&#128205; View on Google Maps</a></div>"
                  : "");

        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8"/>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                  <title>You've Made the Team!</title>
                </head>
                <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:32px 0;">
                    <tr>
                      <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%%;">

                          <!-- Header -->
                          <tr>
                            <td style="background-color:#1b5e20;border-radius:8px 8px 0 0;padding:32px 40px;text-align:center;">
                              <div style="color:#ffffff;font-size:28px;font-weight:700;letter-spacing:1px;">&#127951; Cricket Legend</div>
                              <div style="color:#a5d6a7;font-size:14px;margin-top:6px;letter-spacing:2px;text-transform:uppercase;">Team Announcement</div>
                            </td>
                          </tr>

                          <!-- Congratulations banner -->
                          <tr>
                            <td style="background-color:#2e7d32;padding:20px 40px;text-align:center;">
                              <div style="font-size:32px;">&#127881;</div>
                              <div style="color:#ffffff;font-size:22px;font-weight:700;margin-top:6px;">Congratulations, %s!</div>
                              <div style="color:#c8e6c9;font-size:15px;margin-top:6px;">You have been selected to represent <strong>%s</strong></div>
                              %s
                            </td>
                          </tr>

                          <!-- Body -->
                          <tr>
                            <td style="background-color:#ffffff;padding:40px;">

                              <p style="margin:0 0 28px;font-size:15px;color:#555555;line-height:1.6;">
                                Well done on your selection! Below are the details for the upcoming match. Please make sure you arrive on time and are prepared.
                              </p>

                              <!-- Match title banner -->
                              <div style="background-color:#e8f5e9;border-left:4px solid #2e7d32;border-radius:4px;padding:16px 20px;margin-bottom:28px;">
                                <div style="font-size:18px;font-weight:700;color:#1b5e20;">%s</div>
                                %s
                              </div>

                              <!-- Match details grid -->
                              <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                                <tr>
                                  <td style="padding-bottom:16px;" width="50%%">
                                    <div style="font-size:11px;font-weight:600;color:#888888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Date</div>
                                    <div style="font-size:15px;color:#222222;font-weight:500;">%s</div>
                                  </td>
                                  <td style="padding-bottom:16px;" width="50%%">
                                    <div style="font-size:11px;font-weight:600;color:#888888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Team</div>
                                    <div style="font-size:15px;color:#222222;font-weight:500;">%s</div>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding-bottom:16px;" width="50%%">
                                    <div style="font-size:11px;font-weight:600;color:#888888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Start Time</div>
                                    <div style="font-size:15px;color:#222222;font-weight:500;">%s</div>
                                  </td>
                                  <td style="padding-bottom:16px;" width="50%%">
                                    <div style="font-size:11px;font-weight:600;color:#888888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Arrival Time</div>
                                    <div style="font-size:15px;color:#222222;font-weight:500;">%s</div>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding-bottom:16px;" width="50%%">
                                    <div style="font-size:11px;font-weight:600;color:#888888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Toss Time</div>
                                    <div style="font-size:15px;color:#222222;font-weight:500;">%s</div>
                                  </td>
                                  <td style="padding-bottom:16px;" width="50%%">
                                    <div style="font-size:11px;font-weight:600;color:#888888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Venue</div>
                                    <div style="font-size:15px;color:#222222;font-weight:500;">%s</div>
                                    %s
                                  </td>
                                </tr>
                              </table>

                              <!-- CTA Button -->
                              <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                                <tr>
                                  <td align="center">
                                    <a href="%s"
                                       style="display:inline-block;background-color:#2e7d32;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:6px;letter-spacing:0.5px;">
                                      View Team Sheet &#8594;
                                    </a>
                                  </td>
                                </tr>
                              </table>

                              <!-- Divider -->
                              <hr style="border:none;border-top:1px solid #e0e0e0;margin-bottom:24px;"/>

                              <p style="margin:0;font-size:13px;color:#888888;line-height:1.6;">
                                If the button doesn't work, copy and paste this link into your browser:<br/>
                                <a href="%s" style="color:#2e7d32;word-break:break-all;">%s</a>
                              </p>

                            </td>
                          </tr>

                          <!-- Footer -->
                          <tr>
                            <td style="background-color:#f4f6f8;border-radius:0 0 8px 8px;padding:24px 40px;text-align:center;border-top:1px solid #e0e0e0;">
                              <p style="margin:0 0 8px;font-size:12px;color:#aaaaaa;">
                                You received this email because you opted in to Cricket Legend email notifications.
                              </p>
                              <p style="margin:0;font-size:12px;color:#aaaaaa;">
                                To unsubscribe, update your notification preferences in the Cricket Legend app.
                              </p>
                            </td>
                          </tr>

                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(
                d.playerName(),
                d.teamName(),
                roles.isEmpty() ? "" : "<div style=\"margin-top:12px;\">" + roles + "</div>",
                d.matchTitle(),
                tournamentLine,
                d.matchDate(),
                d.teamName(),
                d.startTime(),
                d.arrivalTime(),
                d.tossTime(),
                d.venue(),
                venueAddressHtml,
                d.teamsheetUrl(),
                d.teamsheetUrl(),
                d.teamsheetUrl()
        );
    }

    private String buildHtml(PollEmailData d) {
        String tournamentLine = d.tournament() != null
                ? "<div style=\"font-size:13px;color:#4caf50;margin-top:4px;\">"
                + d.tournament()
                + (d.matchStage() != null && !d.matchStage().isBlank() ? " &bull; " + d.matchStage() : "")
                + "</div>"
                : (d.matchStage() != null && !d.matchStage().isBlank()
                ? "<div style=\"font-size:13px;color:#4caf50;margin-top:4px;\">" + d.matchStage() + "</div>"
                : "");

        String venueAddressHtml = d.venueAddress() != null && !d.venueAddress().isBlank()
                ? "<div style=\"font-size:13px;color:#666666;margin-top:2px;\">"
                + (d.mapsUrl() != null
                ? "<a href=\"" + d.mapsUrl() + "\" style=\"color:#2e7d32;text-decoration:none;\">" + d.venueAddress() + "</a>"
                : d.venueAddress())
                + "</div>"
                : "";

        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8"/>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                  <title>Availability Poll</title>
                </head>
                <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:32px 0;">
                    <tr>
                      <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%%;">

                          <!-- Header -->
                          <tr>
                            <td style="background-color:#1b5e20;border-radius:8px 8px 0 0;padding:32px 40px;text-align:center;">
                              <div style="color:#ffffff;font-size:28px;font-weight:700;letter-spacing:1px;">&#127951; Cricket Legend</div>
                              <div style="color:#a5d6a7;font-size:14px;margin-top:6px;letter-spacing:2px;text-transform:uppercase;">Availability Poll</div>
                            </td>
                          </tr>

                          <!-- Body -->
                          <tr>
                            <td style="background-color:#ffffff;padding:40px;">

                              <!-- Greeting -->
                              <p style="margin:0 0 8px;font-size:16px;color:#333333;">Hi <strong>%s</strong>,</p>
                              <p style="margin:0 0 28px;font-size:15px;color:#555555;line-height:1.6;">
                                An availability poll has been opened for the upcoming match. Please confirm your availability as soon as possible so the team can be planned accordingly.
                              </p>

                              <!-- Match title banner -->
                              <div style="background-color:#e8f5e9;border-left:4px solid #2e7d32;border-radius:4px;padding:16px 20px;margin-bottom:28px;">
                                <div style="font-size:18px;font-weight:700;color:#1b5e20;">%s</div>
                                %s
                              </div>

                              <!-- Match details grid -->
                              <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                                <tr>
                                  <td style="padding-bottom:16px;" width="50%%">
                                    <div style="font-size:11px;font-weight:600;color:#888888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Date</div>
                                    <div style="font-size:15px;color:#222222;font-weight:500;">%s</div>
                                  </td>
                                  <td style="padding-bottom:16px;" width="50%%">
                                    <div style="font-size:11px;font-weight:600;color:#888888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Team</div>
                                    <div style="font-size:15px;color:#222222;font-weight:500;">%s</div>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding-bottom:16px;" width="50%%">
                                    <div style="font-size:11px;font-weight:600;color:#888888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Start Time</div>
                                    <div style="font-size:15px;color:#222222;font-weight:500;">%s</div>
                                  </td>
                                  <td style="padding-bottom:16px;" width="50%%">
                                    <div style="font-size:11px;font-weight:600;color:#888888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Arrival Time</div>
                                    <div style="font-size:15px;color:#222222;font-weight:500;">%s</div>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding-bottom:16px;" width="50%%">
                                    <div style="font-size:11px;font-weight:600;color:#888888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Toss Time</div>
                                    <div style="font-size:15px;color:#222222;font-weight:500;">%s</div>
                                  </td>
                                  <td style="padding-bottom:16px;" width="50%%">
                                    <div style="font-size:11px;font-weight:600;color:#888888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Venue</div>
                                    <div style="font-size:15px;color:#222222;font-weight:500;">%s</div>
                                    %s
                                  </td>
                                </tr>
                              </table>

                              <!-- CTA Button -->
                              <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                                <tr>
                                  <td align="center">
                                    <a href="%s"
                                       style="display:inline-block;background-color:#2e7d32;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:6px;letter-spacing:0.5px;">
                                      Respond to Poll &#8594;
                                    </a>
                                  </td>
                                </tr>
                              </table>

                              <!-- Divider -->
                              <hr style="border:none;border-top:1px solid #e0e0e0;margin-bottom:24px;"/>

                              <p style="margin:0;font-size:13px;color:#888888;line-height:1.6;">
                                If the button doesn't work, copy and paste this link into your browser:<br/>
                                <a href="%s" style="color:#2e7d32;word-break:break-all;">%s</a>
                              </p>

                            </td>
                          </tr>

                          <!-- Footer -->
                          <tr>
                            <td style="background-color:#f4f6f8;border-radius:0 0 8px 8px;padding:24px 40px;text-align:center;border-top:1px solid #e0e0e0;">
                              <p style="margin:0 0 8px;font-size:12px;color:#aaaaaa;">
                                You received this email because you opted in to Cricket Legend email notifications.
                              </p>
                              <p style="margin:0;font-size:12px;color:#aaaaaa;">
                                To unsubscribe, update your notification preferences in the Cricket Legend app.
                              </p>
                            </td>
                          </tr>

                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(
                d.playerName(),
                d.matchTitle(),
                tournamentLine,
                d.matchDate(),
                d.teamName(),
                d.startTime(),
                d.arrivalTime(),
                d.tossTime(),
                d.venue(),
                venueAddressHtml,
                d.pollUrl(),
                d.pollUrl(),
                d.pollUrl()
        );
    }
}
