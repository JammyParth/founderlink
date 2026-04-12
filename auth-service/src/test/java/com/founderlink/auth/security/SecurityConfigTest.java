package com.founderlink.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class SecurityConfigTest {

    @Mock
    private JwtAuthFilter jwtAuthFilter;

    @Mock
    private CustomUserDetailsService userDetailsService;

    @Test
    void passwordEncoderBeanShouldBeBCrypt() {
        SecurityConfig config = new SecurityConfig(jwtAuthFilter, userDetailsService, new ObjectMapper());
        PasswordEncoder encoder = config.passwordEncoder();

        assertThat(encoder).isInstanceOf(BCryptPasswordEncoder.class);
    }

    @Test
    void passwordEncoderShouldEncodeAndMatchPassword() {
        SecurityConfig config = new SecurityConfig(jwtAuthFilter, userDetailsService, new ObjectMapper());
        PasswordEncoder encoder = config.passwordEncoder();

        String raw = "Secret123";
        String encoded = encoder.encode(raw);

        assertThat(encoded).isNotEqualTo(raw);
        assertThat(encoder.matches(raw, encoded)).isTrue();
        assertThat(encoder.matches("wrong", encoded)).isFalse();
    }

    @Test
    void authenticationProviderBeanShouldBeDaoProvider() {
        SecurityConfig config = new SecurityConfig(jwtAuthFilter, userDetailsService, new ObjectMapper());
        var provider = config.authenticationProvider();

        assertThat(provider).isInstanceOf(DaoAuthenticationProvider.class);
    }
}
