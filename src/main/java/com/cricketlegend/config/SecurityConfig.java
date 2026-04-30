package com.cricketlegend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.config.Customizer;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final KeycloakJwtConverter keycloakJwtConverter;

    private static final String[] PUBLIC_ENDPOINTS = {
            "/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/actuator/health",
            "/api/v1/files/**",
            "/api/v1/matches/upcoming",
            "/api/v1/matches/live",
            "/api/v1/matches/recent-results",
            "/api/v1/matches/tournament/*",
            "/api/v1/matches/tournament/*/results",
            "/api/v1/matches/*",
            "/api/v1/matches/*/result",
            "/api/v1/sponsors",
            "/api/v1/tournaments",
            "/api/v1/tournaments/*",
            "/api/v1/tournaments/*/standings",
            "/api/v1/media",
            "/api/v1/social-media-pages/enabled",
            "/api/v1/app-settings"
    };

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/api/v1/files/proof/**").authenticated()
                    .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/v1/**").authenticated()
                    .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                    .jwt(jwt -> jwt.jwtAuthenticationConverter(keycloakJwtConverter))
            );

        return http.build();
    }
}
