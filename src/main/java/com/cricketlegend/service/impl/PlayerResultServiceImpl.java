package com.cricketlegend.service.impl;

import com.cricketlegend.domain.PlayerResult;
import com.cricketlegend.dto.PlayerResultDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.mapper.PlayerResultMapper;
import com.cricketlegend.repository.*;
import com.cricketlegend.service.PlayerResultService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlayerResultServiceImpl implements PlayerResultService {

    private final PlayerResultRepository playerResultRepository;
    private final PlayerRepository playerRepository;
    private final MatchRepository matchRepository;
    private final TeamRepository teamRepository;
    private final PlayerResultMapper playerResultMapper;

    @Override
    public List<PlayerResultDTO> findByMatch(Long matchId) {
        return playerResultRepository.findByMatchMatchId(matchId)
                .stream().map(playerResultMapper::toDto).toList();
    }

    @Override
    public List<PlayerResultDTO> findByPlayer(Long playerId) {
        return playerResultRepository.findByPlayerPlayerId(playerId)
                .stream().map(playerResultMapper::toDto).toList();
    }

    @Override
    @Transactional
    public PlayerResultDTO create(PlayerResultDTO dto) {
        PlayerResult pr = playerResultMapper.toEntity(dto);
        resolveAssociations(pr, dto);
        return playerResultMapper.toDto(playerResultRepository.save(pr));
    }

    @Override
    @Transactional
    public PlayerResultDTO update(Long id, PlayerResultDTO dto) {
        PlayerResult existing = playerResultRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("PlayerResult", id));
        existing.setBattingPosition(dto.getBattingPosition());
        existing.setScore(dto.getScore());
        existing.setBallsFaced(dto.getBallsFaced());
        existing.setFoursHit(dto.getFoursHit());
        existing.setSixesHit(dto.getSixesHit());
        existing.setDismissed(dto.getDismissed());
        existing.setDismissalType(dto.getDismissalType());
        existing.setOversBowled(dto.getOversBowled());
        existing.setWickets(dto.getWickets());
        existing.setWides(dto.getWides());
        existing.setNoBalls(dto.getNoBalls());
        existing.setDots(dto.getDots());
        existing.setCatches(dto.getCatches());
        existing.setManOfMatch(dto.getManOfMatch());
        resolveAssociations(existing, dto);
        return playerResultMapper.toDto(playerResultRepository.save(existing));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!playerResultRepository.existsById(id)) throw NotFoundException.of("PlayerResult", id);
        playerResultRepository.deleteById(id);
    }

    private void resolveAssociations(PlayerResult pr, PlayerResultDTO dto) {
        if (dto.getPlayerId() != null) {
            pr.setPlayer(playerRepository.findById(dto.getPlayerId())
                    .orElseThrow(() -> NotFoundException.of("Player", dto.getPlayerId())));
        }
        if (dto.getMatchId() != null) {
            pr.setMatch(matchRepository.findById(dto.getMatchId())
                    .orElseThrow(() -> NotFoundException.of("Match", dto.getMatchId())));
        }
        if (dto.getTeamId() != null) {
            pr.setTeam(teamRepository.findById(dto.getTeamId())
                    .orElseThrow(() -> NotFoundException.of("Team", dto.getTeamId())));
        }
        if (dto.getDismissedByBowlerId() != null) {
            pr.setDismissedByBowler(playerRepository.findById(dto.getDismissedByBowlerId())
                    .orElseThrow(() -> NotFoundException.of("Player", dto.getDismissedByBowlerId())));
        }
    }
}
