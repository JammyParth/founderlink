package com.founderlink.User_Service.command;

import com.founderlink.User_Service.dto.UserRequestAuthDto;
import com.founderlink.User_Service.dto.UserRequestDto;
import com.founderlink.User_Service.dto.UserResponseDto;
import com.founderlink.User_Service.entity.Role;
import com.founderlink.User_Service.entity.User;
import com.founderlink.User_Service.exceptions.ConflictException;
import com.founderlink.User_Service.exceptions.UserNotFoundException;
import com.founderlink.User_Service.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserCommandServiceTest {

    @Mock
    private UserRepository repository;

    @InjectMocks
    private UserCommandService service;

    private ModelMapper realMapper;
    private User existingUser;
    private UserRequestAuthDto authDto;

    @BeforeEach
    void setUp() {
        realMapper = new ModelMapper();
        // Inject the real mapper via reflection since @InjectMocks can't do it auto here
        org.springframework.test.util.ReflectionTestUtils.setField(service, "modelMapper", realMapper);

        existingUser = new User();
        existingUser.setId(1L);
        existingUser.setName("Alice");
        existingUser.setEmail("alice@founderlink.com");
        existingUser.setRole(Role.FOUNDER);
        existingUser.setUpdatedAt(LocalDateTime.now().minusDays(1));

        authDto = new UserRequestAuthDto();
        authDto.setUserId(1L);
        authDto.setName("Alice");
        authDto.setEmail("alice@founderlink.com");
        authDto.setRole(Role.FOUNDER);
        authDto.setSkills("Java");
        authDto.setExperience("5 years");
        authDto.setBio("Backend dev");
        authDto.setPortfolioLinks("https://portfolio.example/alice");
    }

    // --- createUser ---

    @Test
    void createUser_whenUserDoesNotExist_shouldSaveAndReturn() {
        when(repository.findById(1L)).thenReturn(Optional.empty());
        when(repository.save(any())).thenReturn(existingUser);

        UserResponseDto result = service.createUser(authDto);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getEmail()).isEqualTo("alice@founderlink.com");
        assertThat(captor.getValue().getRole()).isEqualTo(Role.FOUNDER);
        assertThat(captor.getValue().getUpdatedAt()).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
    }

    @Test
    void createUser_whenUserExistsWithSameData_shouldReturnExistingWithoutSave() {
        when(repository.findById(1L)).thenReturn(Optional.of(existingUser));

        UserResponseDto result = service.createUser(authDto);

        verify(repository, never()).save(any());
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getEmail()).isEqualTo("alice@founderlink.com");
    }

    @Test
    void createUser_whenExistingUserHasDifferentEmail_shouldThrowConflict() {
        existingUser.setEmail("other@founderlink.com");
        when(repository.findById(1L)).thenReturn(Optional.of(existingUser));

        assertThatThrownBy(() -> service.createUser(authDto))
                .isInstanceOf(ConflictException.class)
                .hasMessage("User identity data does not match existing record.");

        verify(repository, never()).save(any());
    }

    @Test
    void createUser_whenExistingUserHasDifferentRole_shouldThrowConflict() {
        existingUser.setRole(Role.INVESTOR);
        when(repository.findById(1L)).thenReturn(Optional.of(existingUser));

        assertThatThrownBy(() -> service.createUser(authDto))
                .isInstanceOf(ConflictException.class);
    }

    // --- updateUser ---

    @Test
    void updateUser_whenUserFound_shouldUpdateNonNullFields() {
        LocalDateTime beforeUpdate = existingUser.getUpdatedAt(); // capture before service mutates it
        when(repository.findById(1L)).thenReturn(Optional.of(existingUser));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UserRequestDto dto = new UserRequestDto();
        dto.setName("Alice Updated");
        dto.setBio("New bio");

        UserResponseDto result = service.updateUser(1L, dto);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getName()).isEqualTo("Alice Updated");
        assertThat(captor.getValue().getBio()).isEqualTo("New bio");
        // updatedAt should be refreshed
        assertThat(captor.getValue().getUpdatedAt()).isAfter(beforeUpdate);
    }

    @Test
    void updateUser_whenUserNotFound_shouldThrowUserNotFoundException() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateUser(99L, new UserRequestDto()))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessage("User not found.");

        verify(repository, never()).save(any());
    }

    @Test
    void updateUser_withNullFields_shouldNotOverwriteExistingValues() {
        existingUser.setSkills("Java");
        existingUser.setExperience("5 years");
        when(repository.findById(1L)).thenReturn(Optional.of(existingUser));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UserRequestDto dto = new UserRequestDto();
        // All fields null

        service.updateUser(1L, dto);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getSkills()).isEqualTo("Java");
        assertThat(captor.getValue().getExperience()).isEqualTo("5 years");
    }

    @Test
    void updateUser_withAllFields_shouldUpdateAll() {
        when(repository.findById(1L)).thenReturn(Optional.of(existingUser));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UserRequestDto dto = new UserRequestDto();
        dto.setName("New Name");
        dto.setSkills("Python");
        dto.setExperience("10 years");
        dto.setBio("Senior Dev");
        dto.setPortfolioLinks("https://new.example");

        service.updateUser(1L, dto);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getName()).isEqualTo("New Name");
        assertThat(captor.getValue().getSkills()).isEqualTo("Python");
        assertThat(captor.getValue().getExperience()).isEqualTo("10 years");
        assertThat(captor.getValue().getBio()).isEqualTo("Senior Dev");
        assertThat(captor.getValue().getPortfolioLinks()).isEqualTo("https://new.example");
    }
}
