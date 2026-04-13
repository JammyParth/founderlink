package com.founderlink.User_Service.query;

import com.founderlink.User_Service.dto.UserResponseDto;
import com.founderlink.User_Service.entity.Role;
import com.founderlink.User_Service.entity.User;
import com.founderlink.User_Service.exceptions.UserNotFoundException;
import com.founderlink.User_Service.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserQueryServiceTest {

    @Mock
    private UserRepository repository;

    @InjectMocks
    private UserQueryService service;

    private User alice;

    @BeforeEach
    void setUp() {
        ModelMapper realMapper = new ModelMapper();
        org.springframework.test.util.ReflectionTestUtils.setField(service, "modelMapper", realMapper);

        alice = new User();
        alice.setId(1L);
        alice.setName("Alice");
        alice.setEmail("alice@founderlink.com");
        alice.setRole(Role.FOUNDER);
    }

    // --- getUser ---

    @Test
    void getUser_whenFound_shouldReturnMappedDto() {
        when(repository.findById(1L)).thenReturn(Optional.of(alice));

        UserResponseDto result = service.getUser(1L);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getEmail()).isEqualTo("alice@founderlink.com");
        assertThat(result.getRole()).isEqualTo(Role.FOUNDER);
    }

    @Test
    void getUser_whenNotFound_shouldThrowUserNotFoundException() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getUser(99L))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessage("User not found.");
    }

    // --- getAllUsers(pageable) ---

    @Test
    void getAllUsersPageable_shouldReturnMappedPage() {
        when(repository.findAll(any(Pageable.class))).thenReturn(
                new PageImpl<>(List.of(alice), PageRequest.of(0, 10), 1));

        Page<UserResponseDto> result = service.getAllUsers(PageRequest.of(0, 10));

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).getId()).isEqualTo(1L);
    }

    @Test
    void getAllUsersPageable_whenEmpty_shouldReturnEmptyPage() {
        when(repository.findAll(any(Pageable.class))).thenReturn(
                new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        Page<UserResponseDto> result = service.getAllUsers(PageRequest.of(0, 10));

        assertThat(result).isEmpty();
    }

    // --- getAllUsers() ---

    @Test
    void getAllUsers_shouldReturnListFromUnpagedQuery() {
        when(repository.findAll(any(Pageable.class))).thenReturn(
                new PageImpl<>(List.of(alice)));

        List<UserResponseDto> result = service.getAllUsers();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEmail()).isEqualTo("alice@founderlink.com");
    }

    // --- getUsersByRole(role, pageable) ---

    @Test
    void getUsersByRolePageable_shouldReturnMappedPage() {
        when(repository.findByRole(eq(Role.FOUNDER), any(Pageable.class))).thenReturn(
                new PageImpl<>(List.of(alice), PageRequest.of(0, 10), 1));

        Page<UserResponseDto> result = service.getUsersByRole(Role.FOUNDER, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getRole()).isEqualTo(Role.FOUNDER);
    }

    @Test
    void getUsersByRolePageable_whenNone_shouldReturnEmptyPage() {
        when(repository.findByRole(eq(Role.INVESTOR), any(Pageable.class))).thenReturn(
                new PageImpl<>(List.of()));

        Page<UserResponseDto> result = service.getUsersByRole(Role.INVESTOR, PageRequest.of(0, 10));

        assertThat(result).isEmpty();
    }

    // --- getUsersByRole(role) ---

    @Test
    void getUsersByRole_shouldReturnListFromUnpagedQuery() {
        when(repository.findByRole(eq(Role.COFOUNDER), any(Pageable.class))).thenReturn(
                new PageImpl<>(List.of(alice)));

        List<UserResponseDto> result = service.getUsersByRole(Role.COFOUNDER);

        assertThat(result).hasSize(1);
    }

    // --- countByRole ---

    @Test
    void countByRole_shouldReturnRepositoryCount() {
        when(repository.countByRole(Role.FOUNDER)).thenReturn(7L);

        long count = service.countByRole(Role.FOUNDER);

        assertThat(count).isEqualTo(7L);
    }

    @Test
    void countByRole_whenNone_shouldReturnZero() {
        when(repository.countByRole(Role.ADMIN)).thenReturn(0L);

        long count = service.countByRole(Role.ADMIN);

        assertThat(count).isZero();
    }
}
