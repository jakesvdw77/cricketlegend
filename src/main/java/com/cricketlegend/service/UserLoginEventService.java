package com.cricketlegend.service;

import com.cricketlegend.dto.PagedLoginEventResponse;
import org.springframework.security.oauth2.jwt.Jwt;

public interface UserLoginEventService {
    void record(Jwt jwt);
    PagedLoginEventResponse findWithFilters(String name, int page, int size);
}
