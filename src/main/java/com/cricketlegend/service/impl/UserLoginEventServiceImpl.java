package com.cricketlegend.service.impl;

import com.cricketlegend.domain.UserLoginEvent;
import com.cricketlegend.dto.PagedLoginEventResponse;
import com.cricketlegend.dto.UserLoginEventDTO;
import com.cricketlegend.repository.UserLoginEventRepository;
import com.cricketlegend.service.UserLoginEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserLoginEventServiceImpl implements UserLoginEventService {

    private static final List<String> APP_ROLES = List.of("admin", "manager", "player");

    private final UserLoginEventRepository loginEventRepository;

    @Override
    @Transactional
    public void record(Jwt jwt) {
        String firstName = jwt.getClaimAsString("given_name");
        String lastName = jwt.getClaimAsString("family_name");
        if (firstName == null) firstName = jwt.getClaimAsString("preferred_username");
        if (lastName == null) lastName = "";

        String role = extractPrimaryRole(jwt);

        loginEventRepository.save(UserLoginEvent.builder()
                .firstName(firstName)
                .lastName(lastName)
                .role(role)
                .loginTime(LocalDateTime.now())
                .build());
    }

    @Override
    public PagedLoginEventResponse findWithFilters(String name, int page, int size) {
        String nameFilter = (name == null || name.isBlank()) ? null : name.trim();
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "loginTime"));
        Page<UserLoginEvent> result = nameFilter == null
                ? loginEventRepository.findAll(pageable)
                : loginEventRepository.findByNameFilter(nameFilter, pageable);

        List<UserLoginEventDTO> content = result.getContent().stream()
                .map(e -> UserLoginEventDTO.builder()
                        .loginEventId(e.getLoginEventId())
                        .firstName(e.getFirstName())
                        .lastName(e.getLastName())
                        .role(e.getRole())
                        .loginTime(e.getLoginTime())
                        .build())
                .toList();

        return PagedLoginEventResponse.builder()
                .content(content)
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    @SuppressWarnings("unchecked")
    private String extractPrimaryRole(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess != null) {
            List<String> roles = (List<String>) realmAccess.get("roles");
            if (roles != null) {
                for (String appRole : APP_ROLES) {
                    if (roles.contains(appRole)) return appRole;
                }
            }
        }
        return "unknown";
    }
}
