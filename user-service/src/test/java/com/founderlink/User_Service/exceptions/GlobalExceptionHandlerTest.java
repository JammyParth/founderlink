package com.founderlink.User_Service.exceptions;

import com.founderlink.User_Service.dto.ErrorResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @Test
    void handleUserNotFoundException_shouldReturn404() {
        UserNotFoundException ex = new UserNotFoundException("User not found.");

        ResponseEntity<ErrorResponse> response = handler.handleUserNotFoundException(ex);

        var body = response.getBody();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(body).isNotNull();
        assertThat(body.getStatus()).isEqualTo(404);
        assertThat(body.getMessage()).isEqualTo("NOT_FOUND");
        assertThat(body.getError()).isEqualTo("User not found.");
    }

    @Test
    void handleConflictException_shouldReturn409() {
        ConflictException ex = new ConflictException("User identity data does not match existing record.");

        ResponseEntity<ErrorResponse> response = handler.handleConflictException(ex);

        var body = response.getBody();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(body).isNotNull();
        assertThat(body.getStatus()).isEqualTo(409);
        assertThat(body.getMessage()).isEqualTo("CONFLICT");
        assertThat(body.getError()).isEqualTo("User identity data does not match existing record.");
    }

    @Test
    void handleException_shouldReturn500ForUnknownException() {
        Exception ex = new RuntimeException("Something went wrong");

        ResponseEntity<ErrorResponse> response = handler.handleException(ex);

        var body = response.getBody();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(body).isNotNull();
        assertThat(body.getStatus()).isEqualTo(500);
        assertThat(body.getMessage()).isEqualTo("INTERNAL_SERVER_ERROR");
        assertThat(body.getError()).isEqualTo("Something went wrong");
    }

    @Test
    void handleValidation_shouldReturn400WithFieldErrorMessage() {
        Object target = new Object();
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(target, "dto");
        bindingResult.addError(new FieldError("dto", "email", "Email is Required"));

        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        when(ex.getBindingResult()).thenReturn(bindingResult);

        ResponseEntity<ErrorResponse> response = handler.handleValidation(ex);

        var body = response.getBody();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(body).isNotNull();
        assertThat(body.getStatus()).isEqualTo(400);
        assertThat(body.getMessage()).isEqualTo("VALIDATION_ERROR");
        assertThat(body.getError()).isEqualTo("Email is Required");
    }
}
