package com.founderlink.team.exception;

@SuppressWarnings("serial")
public class InvalidInvitationStatusException
        extends RuntimeException {

    public InvalidInvitationStatusException(String message) {
        super(message);
    }
}