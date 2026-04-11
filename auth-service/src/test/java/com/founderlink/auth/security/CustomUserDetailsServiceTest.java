package com.founderlink.auth.security;

import com.founderlink.auth.entity.Role;
import com.founderlink.auth.entity.User;
import com.founderlink.auth.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomUserDetailsServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void loadUserByUsernameShouldReturnUserDetailsWhenUserExists() {
        User user = new User();
        user.setId(1L);
        user.setEmail("alice@founderlink.com");
        user.setPassword("encoded-password");
        user.setRole(Role.FOUNDER);

        when(userRepository.findByEmail("alice@founderlink.com")).thenReturn(Optional.of(user));

        UserDetails userDetails = customUserDetailsService.loadUserByUsername("alice@founderlink.com");

        assertThat(userDetails.getUsername()).isEqualTo("alice@founderlink.com");
        assertThat(userDetails.getPassword()).isEqualTo("encoded-password");
        assertThat(userDetails.getAuthorities()).hasSize(1);
        assertThat(userDetails.getAuthorities().iterator().next().getAuthority()).isEqualTo("ROLE_FOUNDER");
    }

    @Test
    void loadUserByUsernameShouldThrowUsernameNotFoundExceptionWhenUserDoesNotExist() {
        when(userRepository.findByEmail("missing@founderlink.com")).thenReturn(Optional.empty());

        UsernameNotFoundException exception = assertThrows(
                UsernameNotFoundException.class,
                () -> customUserDetailsService.loadUserByUsername("missing@founderlink.com")
        );

        assertThat(exception.getMessage()).contains("missing@founderlink.com");
    }

    @Test
    void loadUserByUsernameShouldMapAdminRoleCorrectly() {
        User admin = new User();
        admin.setId(2L);
        admin.setEmail("admin@founderlink.com");
        admin.setPassword("admin-encoded");
        admin.setRole(Role.ADMIN);

        when(userRepository.findByEmail("admin@founderlink.com")).thenReturn(Optional.of(admin));

        UserDetails userDetails = customUserDetailsService.loadUserByUsername("admin@founderlink.com");

        assertThat(userDetails.getAuthorities().iterator().next().getAuthority()).isEqualTo("ROLE_ADMIN");
    }
}
