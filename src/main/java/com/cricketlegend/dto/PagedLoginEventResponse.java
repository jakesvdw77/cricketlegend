package com.cricketlegend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagedLoginEventResponse {
    private List<UserLoginEventDTO> content;
    private long totalElements;
    private int totalPages;
}
