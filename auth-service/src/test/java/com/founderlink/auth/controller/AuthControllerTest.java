package com.founderlink.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.founderlink.auth.config.RefreshTokenProperties;
import com.founderlink.auth.dto.AuthResponse;
import com.founderlink.auth.dto.ForgotPasswordResponse;
import com.founderlink.auth.dto.LoginRequest;
import com.founderlink.auth.dto.RegisterRequest;
import com.founderlink.auth.dto.RegisterResponse;
import com.founderlink.auth.dto.ResetPasswordRequest;
import com.founderlink.auth.dto.ResetPasswordResponse;
import com.founderlink.auth.entity.Role;
import com.founderlink.auth.exception.EmailAlreadyExistsException;
import com.founderlink.auth.exception.GlobalExceptionHandler;
import com.founderlink.auth.exception.InvalidRefreshTokenException;
import com.founderlink.auth.service.AuthService;
import com.founderlink.auth.service.AuthSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Duration;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        RefreshTokenProperties refreshTokenProperties = new RefreshTokenProperties();
        refreshTokenProperties.setExpiration(Duration.ofDays(30));
        refreshTokenProperties.setCookieName("refresh_token");
        refreshTokenProperties.setCookiePath("/auth");
        refreshTokenProperties.setCookieSameSite("None");
        refreshTokenProperties.setCookieSecure(true);

        mockMvc = MockMvcBuilders
                .standaloneSetup(new AuthController(authService, refreshTokenProperties))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void registerShouldReturn200WhenRequestIsValid() throws Exception {
        RegisterRequest request = new RegisterRequest("Alice Founder", "alice@founderlink.com", "Secret123", Role.FOUNDER);
        RegisterResponse response = RegisterResponse.builder()
                .email("alice@founderlink.com")
                .role("FOUNDER")
                .message("User registered successfully")
                .build();

        when(authService.register(any(RegisterRequest.class))).thenReturn(response);

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("alice@founderlink.com"))
                .andExpect(jsonPath("$.role").value("FOUNDER"))
                .andExpect(jsonPath("$.message").value("User registered successfully"));
    }

    @Test
    void registerShouldReturn409WhenEmailAlreadyExists() throws Exception {
        RegisterRequest request = new RegisterRequest("Alice Founder", "alice@founderlink.com", "Secret123", Role.FOUNDER);

        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new EmailAlreadyExistsException("Email already registered"));

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email already registered"));
    }

    @Test
    void registerShouldReturn400WhenRequestBodyIsMissing() throws Exception {
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void loginShouldReturn200AndSetRefreshTokenCookie() throws Exception {
        LoginRequest request = new LoginRequest("alice@founderlink.com", "Secret123");
        AuthResponse authResponse = AuthResponse.builder()
                .token("access-token")
                .email("alice@founderlink.com")
                .role("FOUNDER")
                .userId(1L)
                .build();

        when(authService.login(any(LoginRequest.class)))
                .thenReturn(new AuthSession(authResponse, "new-refresh-token"));

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("refresh_token"))
                .andExpect(jsonPath("$.token").value("access-token"))
                .andExpect(jsonPath("$.email").value("alice@founderlink.com"))
                .andExpect(jsonPath("$.role").value("FOUNDER"));
    }

    @Test
    void refreshShouldReturnNewAccessTokenAndRotateRefreshCookie() throws Exception {
        AuthResponse authResponse = AuthResponse.builder()
                .token("new-access-token")
                .email("alice@founderlink.com")
                .role("FOUNDER")
                .userId(25L)
                .build();

        when(authService.refresh("incoming-refresh-token"))
                .thenReturn(new AuthSession(authResponse, "rotated-refresh-token"));

        mockMvc.perform(post("/auth/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("refresh_token", "incoming-refresh-token"))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(cookie().value("refresh_token", "rotated-refresh-token"))
                .andExpect(cookie().httpOnly("refresh_token", true))
                .andExpect(cookie().secure("refresh_token", true))
                .andExpect(jsonPath("$.token").value("new-access-token"))
                .andExpect(jsonPath("$.email").value("alice@founderlink.com"))
                .andExpect(jsonPath("$.role").value("FOUNDER"))
                .andExpect(jsonPath("$.userId").value(25L));

        verify(authService).refresh("incoming-refresh-token");
    }

    @Test
    void refreshShouldResolveTokenFromAuthorizationHeaderWhenNoCookie() throws Exception {
        AuthResponse authResponse = AuthResponse.builder()
                .token("new-access-token")
                .email("bob@founderlink.com")
                .role("INVESTOR")
                .userId(10L)
                .build();

        when(authService.refresh("header-refresh-token"))
                .thenReturn(new AuthSession(authResponse, "rotated-token"));

        mockMvc.perform(post("/auth/refresh")
                        .header("Authorization", "Bearer header-refresh-token")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("new-access-token"));
    }

    @Test
    void logoutShouldReturn204AndClearRefreshCookie() throws Exception {
        doNothing().when(authService).logout(anyString());

        mockMvc.perform(post("/auth/logout")
                        .cookie(new jakarta.servlet.http.Cookie("refresh_token", "some-refresh-token")))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge("refresh_token", 0));
    }

    @Test
    void logoutShouldReturn204EvenWithoutRefreshToken() throws Exception {
        mockMvc.perform(post("/auth/logout"))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge("refresh_token", 0));
    }

    @Test
    void forgotPasswordShouldReturn200WhenEmailIsValid() throws Exception {
        ForgotPasswordResponse response = ForgotPasswordResponse.builder()
                .message("Password reset PIN has been sent to your email")
                .build();

        when(authService.forgotPassword("alice@founderlink.com")).thenReturn(response);

        mockMvc.perform(post("/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"alice@founderlink.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password reset PIN has been sent to your email"));
    }

    @Test
    void forgotPasswordShouldReturn400WhenEmailIsInvalid() throws Exception {
        mockMvc.perform(post("/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"not-an-email\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void resetPasswordShouldReturn200WhenRequestIsValid() throws Exception {
        ResetPasswordRequest request = new ResetPasswordRequest("alice@founderlink.com", "123456", "NewSecret123");
        ResetPasswordResponse response = ResetPasswordResponse.builder()
                .message("Password has been reset successfully")
                .build();

        when(authService.resetPassword("alice@founderlink.com", "123456", "NewSecret123"))
                .thenReturn(response);

        mockMvc.perform(post("/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password has been reset successfully"));
    }

    @Test
    void resetPasswordShouldReturn400WhenPinHasWrongFormat() throws Exception {
        mockMvc.perform(post("/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"alice@founderlink.com\",\"pin\":\"abc\",\"newPassword\":\"NewSecret123\"}"))
                .andExpect(status().isBadRequest());
    }
}
