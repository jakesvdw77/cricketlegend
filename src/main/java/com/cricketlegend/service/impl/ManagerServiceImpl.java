package com.cricketlegend.service.impl;

import com.cricketlegend.domain.Manager;
import com.cricketlegend.domain.Player;
import com.cricketlegend.dto.ManagerDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.repository.ManagerRepository;
import com.cricketlegend.repository.PlayerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ManagerServiceImpl implements com.cricketlegend.service.ManagerService {

    private final ManagerRepository managerRepository;
    private final PlayerRepository playerRepository;

    @Override
    public List<ManagerDTO> findAll() {
        return managerRepository.findAll().stream().map(this::toDto).toList();
    }

    @Override
    public ManagerDTO findById(Long id) {
        return managerRepository.findById(id).map(this::toDto)
                .orElseThrow(() -> NotFoundException.of("Manager", id));
    }

    @Override
    @Transactional
    public ManagerDTO create(ManagerDTO dto) {
        Manager manager = Manager.builder()
                .email(dto.getEmail())
                .name(dto.getName())
                .surname(dto.getSurname())
                .phone(dto.getPhone())
                .build();
        resolvePlayer(manager, dto.getPlayerId());
        return toDto(managerRepository.save(manager));
    }

    @Override
    @Transactional
    public ManagerDTO update(Long id, ManagerDTO dto) {
        Manager manager = managerRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Manager", id));
        manager.setEmail(dto.getEmail());
        manager.setName(dto.getName());
        manager.setSurname(dto.getSurname());
        manager.setPhone(dto.getPhone());
        resolvePlayer(manager, dto.getPlayerId());
        return toDto(managerRepository.save(manager));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!managerRepository.existsById(id)) throw NotFoundException.of("Manager", id);
        managerRepository.deleteById(id);
    }

    private void resolvePlayer(Manager manager, Long playerId) {
        if (playerId != null) {
            Player player = playerRepository.findById(playerId)
                    .orElseThrow(() -> NotFoundException.of("Player", playerId));
            manager.setPlayer(player);
        } else {
            manager.setPlayer(null);
        }
    }

    public ManagerDTO toDto(Manager m) {
        Player p = m.getPlayer();
        String displayName = p != null
                ? p.getName() + " " + p.getSurname()
                : (m.getName() != null ? m.getName() + " " + m.getSurname() : m.getEmail());
        String phone = p != null ? p.getContactNumber() : m.getPhone();

        return ManagerDTO.builder()
                .managerId(m.getManagerId())
                .playerId(p != null ? p.getPlayerId() : null)
                .playerDisplayName(p != null ? p.getName() + " " + p.getSurname() : null)
                .name(m.getName())
                .surname(m.getSurname())
                .email(m.getEmail())
                .phone(phone)
                .displayName(displayName)
                .build();
    }
}
