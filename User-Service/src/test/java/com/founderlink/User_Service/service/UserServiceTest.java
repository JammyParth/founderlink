package com.founderlink.User_Service.service;

import com.founderlink.User_Service.command.UserCommandService;
import com.founderlink.User_Service.dto.UserRequestAuthDto;
import com.founderlink.User_Service.dto.UserRequestDto;
import com.founderlink.User_Service.dto.UserResponseDto;
import com.founderlink.User_Service.entity.Role;
import com.founderlink.User_Service.query.UserQueryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserCommandService commandService;

    @Mock
    private UserQueryService queryService;

    @InjectMocks
    private UserService userService;

    private UserResponseDto dto() {
        UserResponseDto r = new UserResponseDto();
        r.setId(1L);
        r.setEmail("alice@founderlink.com");
        r.setRole(Role.FOUNDER);
        return r;
    }

    @Test
    void createUser_delegatesToCommandService() {
        UserRequestAuthDto req = new UserRequestAuthDto();
        when(commandService.createUser(req)).thenReturn(dto());

        UserResponseDto result = userService.createUser(req);

        verify(commandService).createUser(req);
        assertThat(result.getId()).isEqualTo(1L);
    }

    @Test
    void updateUser_delegatesToCommandService() {
        UserRequestDto req = new UserRequestDto();
        when(commandService.updateUser(1L, req)).thenReturn(dto());

        UserResponseDto result = userService.updateUser(1L, req);

        verify(commandService).updateUser(1L, req);
        assertThat(result.getId()).isEqualTo(1L);
    }

    @Test
    void getUser_delegatesToQueryService() {
        when(queryService.getUser(1L)).thenReturn(dto());

        UserResponseDto result = userService.getUser(1L);

        verify(queryService).getUser(1L);
        assertThat(result.getEmail()).isEqualTo("alice@founderlink.com");
    }

    @Test
    void getAllUsers_delegatesToQueryService() {
        when(queryService.getAllUsers()).thenReturn(List.of(dto()));

        List<UserResponseDto> result = userService.getAllUsers();

        verify(queryService).getAllUsers();
        assertThat(result).hasSize(1);
    }

    @Test
    void getAllUsersPageable_delegatesToQueryService() {
        PageRequest pageable = PageRequest.of(0, 10);
        Page<UserResponseDto> page = new PageImpl<>(List.of(dto()));
        when(queryService.getAllUsers(pageable)).thenReturn(page);

        Page<UserResponseDto> result = userService.getAllUsers(pageable);

        verify(queryService).getAllUsers(pageable);
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void getUsersByRole_delegatesToQueryService() {
        when(queryService.getUsersByRole(Role.FOUNDER)).thenReturn(List.of(dto()));

        List<UserResponseDto> result = userService.getUsersByRole(Role.FOUNDER);

        verify(queryService).getUsersByRole(Role.FOUNDER);
        assertThat(result).hasSize(1);
    }

    @Test
    void getUsersByRolePageable_delegatesToQueryService() {
        PageRequest pageable = PageRequest.of(0, 10);
        Page<UserResponseDto> page = new PageImpl<>(List.of(dto()));
        when(queryService.getUsersByRole(Role.INVESTOR, pageable)).thenReturn(page);

        Page<UserResponseDto> result = userService.getUsersByRole(Role.INVESTOR, pageable);

        verify(queryService).getUsersByRole(Role.INVESTOR, pageable);
        assertThat(result).hasSize(1);
    }

    @Test
    void countByRole_delegatesToQueryService() {
        when(queryService.countByRole(Role.COFOUNDER)).thenReturn(4L);

        long count = userService.countByRole(Role.COFOUNDER);

        verify(queryService).countByRole(Role.COFOUNDER);
        assertThat(count).isEqualTo(4L);
    }
}
