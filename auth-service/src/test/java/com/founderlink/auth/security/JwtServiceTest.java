package com.founderlink.auth.security;

import com.founderlink.auth.config.JwtProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class JwtServiceTest {

    @Mock
    private JwtProperties jwtProperties;

    // A valid base64-encoded secret that decodes to 33 bytes (> 32 required)
    private static final String VALID_SECRET = "VGhpc0lzQVN0cm9uZ0pXVFNlY3JldEtleUZvclRlc3RzMTIzNDU2Nzg5MDEy";
    // Use a far-future date so tokens with 15-min expiry are still valid when jjwt validates with system clock
    private static final Instant FIXED_NOW = Instant.parse("2030-01-01T00:00:00Z");

    private Clock clock;
    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        clock = Clock.fixed(FIXED_NOW, ZoneOffset.UTC);
        lenient().when(jwtProperties.getSecret()).thenReturn(VALID_SECRET);
        lenient().when(jwtProperties.getAccessTokenExpiration()).thenReturn(Duration.ofMinutes(15));
        jwtService = new JwtService(jwtProperties, clock);
        jwtService.init();
    }

    @Test
    void generateTokenShouldReturnAThreePartJwt() {
        String token = jwtService.generateToken(42L, "FOUNDER");

        assertThat(token).isNotBlank();
        assertThat(token.split("\\.")).hasSize(3);
    }

    @Test
    void extractUsernameShouldReturnUserIdAsString() {
        String token = jwtService.generateToken(99L, "INVESTOR");

        assertThat(jwtService.extractUsername(token)).isEqualTo("99");
    }

    @Test
    void extractRoleShouldReturnRoleClaimValue() {
        String token = jwtService.generateToken(5L, "ADMIN");

        assertThat(jwtService.extractRole(token)).isEqualTo("ADMIN");
    }

    @Test
    void extractUserIdShouldReturnParsedLong() {
        String token = jwtService.generateToken(77L, "FOUNDER");

        assertThat(jwtService.extractUserId(token)).isEqualTo(77L);
    }

    @Test
    void isTokenExpiredShouldReturnFalseForFreshToken() {
        String token = jwtService.generateToken(1L, "FOUNDER");

        assertThat(jwtService.isTokenExpired(token)).isFalse();
    }

    @Test
    void validateTokenShouldReturnFalseForTokenExpiredBeforeNow() {
        // Token was issued in the past (2026) with a 1-second lifetime, so it's expired by 2030
        Clock pastClock = Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC);
        JwtService pastService = new JwtService(jwtProperties, pastClock);
        pastService.init();
        String expiredToken = pastService.generateToken(1L, "FOUNDER");

        // Current clock is 2030-01-01; the token expired in 2026
        assertThat(jwtService.validateToken(expiredToken)).isFalse();
    }

    @Test
    void validateTokenShouldReturnTrueForValidToken() {
        String token = jwtService.generateToken(10L, "FOUNDER");

        assertThat(jwtService.validateToken(token)).isTrue();
    }

    @Test
    void validateTokenShouldReturnFalseForMalformedToken() {
        assertThat(jwtService.validateToken("not.a.valid.token")).isFalse();
    }

    @Test
    void validateTokenShouldReturnFalseForEmptyString() {
        assertThat(jwtService.validateToken("")).isFalse();
    }

    @Test
    void extractExpirationShouldReturnCorrectExpiryDate() {
        String token = jwtService.generateToken(1L, "FOUNDER");
        Date expiration = jwtService.extractExpiration(token);

        Instant expectedExpiry = FIXED_NOW.plus(Duration.ofMinutes(15));
        assertThat(expiration.toInstant()).isEqualTo(expectedExpiry);
    }

    @Test
    void extractClaimShouldWorkWithCustomClaimsResolver() {
        String token = jwtService.generateToken(55L, "COFOUNDER");

        String subject = jwtService.extractClaim(token, claims -> claims.getSubject());
        assertThat(subject).isEqualTo("55");
    }

    @Test
    void initShouldThrowWhenSecretIsTooShort() {
        when(jwtProperties.getSecret()).thenReturn("tooshort"); // 8 bytes < 32 bytes
        JwtService badService = new JwtService(jwtProperties, clock);

        assertThatThrownBy(badService::init)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("256 bits");
    }
}
