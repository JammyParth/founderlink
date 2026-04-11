package com.founderlink.auth.config;

import com.founderlink.auth.exception.AdminSeedingException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminSeedRunnerTest {

    @Mock
    private AdminSeeder adminSeeder;

    @InjectMocks
    private AdminSeedRunner adminSeedRunner;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(adminSeedRunner, "adminName", "Super Admin");
        ReflectionTestUtils.setField(adminSeedRunner, "adminEmail", "admin@founderlink.com");
        ReflectionTestUtils.setField(adminSeedRunner, "adminPassword", "Admin@Pass1");
    }

    @Test
    void runShouldSkipSeedingWhenSeedAdminIsFalse() throws Exception {
        ReflectionTestUtils.setField(adminSeedRunner, "seedAdmin", false);

        adminSeedRunner.run();

        verifyNoInteractions(adminSeeder);
    }

    @Test
    void runShouldSkipWhenAdminPasswordIsBlank() throws Exception {
        ReflectionTestUtils.setField(adminSeedRunner, "seedAdmin", true);
        ReflectionTestUtils.setField(adminSeedRunner, "adminPassword", "");

        adminSeedRunner.run();

        verifyNoInteractions(adminSeeder);
    }

    @Test
    void runShouldSkipWhenAdminPasswordIsNull() throws Exception {
        ReflectionTestUtils.setField(adminSeedRunner, "seedAdmin", true);
        ReflectionTestUtils.setField(adminSeedRunner, "adminPassword", null);

        adminSeedRunner.run();

        verifyNoInteractions(adminSeeder);
    }

    @Test
    void runShouldSkipWhenPasswordFailsValidationNoUpperCase() throws Exception {
        ReflectionTestUtils.setField(adminSeedRunner, "seedAdmin", true);
        // Password has lowercase + digits but no uppercase
        ReflectionTestUtils.setField(adminSeedRunner, "adminPassword", "lowercase1");

        adminSeedRunner.run();

        verifyNoInteractions(adminSeeder);
    }

    @Test
    void runShouldSkipWhenPasswordFailsValidationTooShort() throws Exception {
        ReflectionTestUtils.setField(adminSeedRunner, "seedAdmin", true);
        // Password fewer than 8 characters
        ReflectionTestUtils.setField(adminSeedRunner, "adminPassword", "Ab1");

        adminSeedRunner.run();

        verifyNoInteractions(adminSeeder);
    }

    @Test
    void runShouldCallSeedAdminWhenEnabledAndPasswordIsValid() throws Exception {
        ReflectionTestUtils.setField(adminSeedRunner, "seedAdmin", true);
        doNothing().when(adminSeeder).seedAdmin("Super Admin", "admin@founderlink.com", "Admin@Pass1");

        adminSeedRunner.run();

        verify(adminSeeder).seedAdmin("Super Admin", "admin@founderlink.com", "Admin@Pass1");
    }

    @Test
    void runShouldContinueStartupWhenSeedAdminThrowsException() throws Exception {
        ReflectionTestUtils.setField(adminSeedRunner, "seedAdmin", true);
        doThrow(new AdminSeedingException("seed failed")).when(adminSeeder).seedAdmin(any(), any(), any());

        // Must not propagate exception – startup continues
        adminSeedRunner.run();

        verify(adminSeeder).seedAdmin(any(), any(), any());
    }
}
