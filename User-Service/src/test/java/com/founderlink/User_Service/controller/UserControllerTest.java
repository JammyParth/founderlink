package com.founderlink.User_Service.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.founderlink.User_Service.dto.UserRequestAuthDto;
import com.founderlink.User_Service.dto.UserRequestDto;
import com.founderlink.User_Service.dto.UserResponseDto;
import com.founderlink.User_Service.entity.Role;
import com.founderlink.User_Service.exceptions.ConflictException;
import com.founderlink.User_Service.exceptions.UserNotFoundException;
import com.founderlink.User_Service.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UserService userService;

    private static final String VALID_AUTH_SOURCE = "gateway";
    private static final String VALID_SECRET = "test-internal-secret";

    private UserResponseDto responseDto;

    @BeforeEach
    void setUp() {
        responseDto = new UserResponseDto();
        responseDto.setId(1L);
        responseDto.setName("Alice");
        responseDto.setEmail("alice@founderlink.com");
        responseDto.setRole(Role.FOUNDER);
    }

    // --- POST /users/internal ---

    @Test
    void createUser_withValidHeaders_shouldReturn200() throws Exception {
        when(userService.createUser(any())).thenReturn(responseDto);

        UserRequestAuthDto dto = buildAuthDto(1L, "alice@founderlink.com", Role.FOUNDER);

        mockMvc.perform(post("/users/internal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Auth-Source", VALID_AUTH_SOURCE)
                        .header("X-Internal-Secret", VALID_SECRET)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(1L));
    }

    @Test
    void createUser_withWrongSecret_shouldReturn403() throws Exception {
        UserRequestAuthDto dto = buildAuthDto(2L, "bob@founderlink.com", Role.INVESTOR);

        mockMvc.perform(post("/users/internal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Auth-Source", VALID_AUTH_SOURCE)
                        .header("X-Internal-Secret", "wrong-secret")
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isForbidden());
    }

    @Test
    void createUser_withMissingHeaders_shouldReturn403() throws Exception {
        UserRequestAuthDto dto = buildAuthDto(3L, "carol@founderlink.com", Role.COFOUNDER);

        mockMvc.perform(post("/users/internal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isForbidden());
    }

    @Test
    void createUser_withInvalidBody_shouldReturn400() throws Exception {
        // Missing required fields (email/userId)
        mockMvc.perform(post("/users/internal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Auth-Source", VALID_AUTH_SOURCE)
                        .header("X-Internal-Secret", VALID_SECRET)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createUser_whenConflict_shouldReturn409() throws Exception {
        when(userService.createUser(any())).thenThrow(new ConflictException("User identity data does not match existing record."));

        UserRequestAuthDto dto = buildAuthDto(1L, "different@founderlink.com", Role.INVESTOR);

        mockMvc.perform(post("/users/internal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Auth-Source", VALID_AUTH_SOURCE)
                        .header("X-Internal-Secret", VALID_SECRET)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isConflict());
    }

    // --- GET /users/{id} ---

    @Test
    void getUser_whenFound_shouldReturn200() throws Exception {
        when(userService.getUser(1L)).thenReturn(responseDto);

        mockMvc.perform(get("/users/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(1L))
                .andExpect(jsonPath("$.email").value("alice@founderlink.com"));
    }

    @Test
    void getUser_whenNotFound_shouldReturn404() throws Exception {
        when(userService.getUser(99L)).thenThrow(new UserNotFoundException("User not found."));

        mockMvc.perform(get("/users/99"))
                .andExpect(status().isNotFound());
    }

    // --- PUT /users/{id} ---

    @Test
    void updateUser_whenFound_shouldReturn200() throws Exception {
        UserResponseDto updated = new UserResponseDto();
        updated.setId(1L);
        updated.setName("Alice Updated");
        updated.setEmail("alice@founderlink.com");
        when(userService.updateUser(eq(1L), any())).thenReturn(updated);

        UserRequestDto dto = new UserRequestDto();
        dto.setName("Alice Updated");

        mockMvc.perform(put("/users/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Alice Updated"));
    }

    @Test
    void updateUser_whenNotFound_shouldReturn404() throws Exception {
        when(userService.updateUser(eq(99L), any())).thenThrow(new UserNotFoundException("User not found."));

        mockMvc.perform(put("/users/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UserRequestDto())))
                .andExpect(status().isNotFound());
    }

    // --- GET /users ---

    @Test
    void getAllUsers_withoutPageParam_shouldReturnList() throws Exception {
        when(userService.getAllUsers()).thenReturn(List.of(responseDto));

        mockMvc.perform(get("/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].userId").value(1L));
    }

    @Test
    void getAllUsers_withPageParam_shouldReturnPaginatedResponse() throws Exception {
        when(userService.getAllUsers(any())).thenReturn(
                new PageImpl<>(List.of(responseDto), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/users").param("page", "0").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }

    // --- GET /users/role/{role} ---

    @Test
    void getUsersByRole_withValidRole_shouldReturn200() throws Exception {
        when(userService.getUsersByRole(Role.FOUNDER)).thenReturn(List.of(responseDto));

        mockMvc.perform(get("/users/role/FOUNDER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].userId").value(1L));
    }

    @Test
    void getUsersByRole_withAdminRole_shouldReturn403() throws Exception {
        mockMvc.perform(get("/users/role/ADMIN"))
                .andExpect(status().isForbidden());
    }

    @Test
    void getUsersByRole_withInvalidRole_shouldReturn400() throws Exception {
        mockMvc.perform(get("/users/role/UNKNOWN_ROLE"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getUsersByRole_withPageParam_shouldReturnPaginatedResponse() throws Exception {
        when(userService.getUsersByRole(eq(Role.INVESTOR), any())).thenReturn(
                new PageImpl<>(List.of(responseDto), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/users/role/INVESTOR").param("page", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void getUsersByRole_withRolePrefix_shouldStripPrefix() throws Exception {
        when(userService.getUsersByRole(Role.COFOUNDER)).thenReturn(List.of(responseDto));

        mockMvc.perform(get("/users/role/ROLE_COFOUNDER"))
                .andExpect(status().isOk());
    }

    // --- GET /users/public/stats ---

    @Test
    void getPublicStats_shouldReturn200WithCounts() throws Exception {
        when(userService.countByRole(Role.FOUNDER)).thenReturn(5L);
        when(userService.countByRole(Role.INVESTOR)).thenReturn(3L);
        when(userService.countByRole(Role.COFOUNDER)).thenReturn(2L);

        mockMvc.perform(get("/users/public/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.founders").value(5L))
                .andExpect(jsonPath("$.investors").value(3L))
                .andExpect(jsonPath("$.cofounders").value(2L));
    }

    private UserRequestAuthDto buildAuthDto(Long id, String email, Role role) {
        UserRequestAuthDto dto = new UserRequestAuthDto();
        dto.setUserId(id);
        dto.setName("Test User");
        dto.setEmail(email);
        dto.setRole(role);
        return dto;
    }

    @Test
    void getAllUsers_withPageAndSortDesc_shouldReturnPaginatedResponse() throws Exception {
        when(userService.getAllUsers(any())).thenReturn(
                new PageImpl<>(List.of(responseDto), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/users").param("page", "0").param("sort", "name,desc"))
                .andExpect(status().isOk());
    }

    @Test
    void getAllUsers_withOversizedPageSize_shouldClampTo50() throws Exception {
        when(userService.getAllUsers(any())).thenReturn(
                new PageImpl<>(List.of(responseDto), PageRequest.of(0, 50), 1));

        mockMvc.perform(get("/users").param("page", "0").param("size", "9999"))
                .andExpect(status().isOk());
    }

    @Test
    void getUsersByRole_withSortDesc_shouldReturnPaginatedResponse() throws Exception {
        when(userService.getUsersByRole(eq(Role.FOUNDER), any())).thenReturn(
                new PageImpl<>(List.of(responseDto), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/users/role/FOUNDER")
                        .param("page", "0")
                        .param("sort", "name,desc"))
                .andExpect(status().isOk());
    }
}
