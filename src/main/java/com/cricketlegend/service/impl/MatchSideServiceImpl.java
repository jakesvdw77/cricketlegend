package com.cricketlegend.service.impl;

import com.cricketlegend.domain .MatchSide;
import com.cricketlegend.dto.MatchSideDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.mapper.MatchSideMapper;
import com.cricketlegend.repository.MatchRepository;
import com.cricketlegend.repository.MatchSideRepository;
import com.cricketlegend.repository.TeamRepository;
import com.cricketlegend.service.MatchSideService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MatchSideServiceImpl implements MatchSideService {

    private final MatchSideRepository matchSideRepository;
    private final MatchRepository matchRepository;
    private final TeamRepository teamRepository;
    private final MatchSideMapper matchSideMapper;

    @Override
    public List<MatchSideDTO> findByMatch(Long matchId) {
        return matchSideRepository.findByMatchMatchId(matchId)
                .stream().map(matchSideMapper::toDto).toList();
    }

    @Override
    public MatchSideDTO findById(Long id) {
        return matchSideRepository.findById(id)
                .map(matchSideMapper::toDto)
                .orElseThrow(() -> NotFoundException.of("MatchSide", id));
    }

    @Override
    @Transactional
    public MatchSideDTO save(MatchSideDTO dto) {
        MatchSide matchSide = dto.getMatchSideId() != null
                ? matchSideRepository.findById(dto.getMatchSideId())
                    .orElse(matchSideMapper.toEntity(dto))
                : matchSideMapper.toEntity(dto);

        if (dto.getMatchId() != null) {
            matchSide.setMatch(matchRepository.findById(dto.getMatchId())
                    .orElseThrow(() -> NotFoundException.of("Match", dto.getMatchId())));
        }
        if (dto.getTeamId() != null) {
            matchSide.setTeam(teamRepository.findById(dto.getTeamId())
                    .orElseThrow(() -> NotFoundException.of("Team", dto.getTeamId())));
        }
        matchSide.setPlayingXi(dto.getPlayingXi());
        matchSide.setTwelfthManPlayerId(dto.getTwelfthManPlayerId());
        matchSide.setWicketKeeperPlayerId(dto.getWicketKeeperPlayerId());
        matchSide.setCaptainPlayerId(dto.getCaptainPlayerId());

        return matchSideMapper.toDto(matchSideRepository.save(matchSide));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!matchSideRepository.existsById(id)) throw NotFoundException.of("MatchSide", id);
        matchSideRepository.deleteById(id);
    }
}
