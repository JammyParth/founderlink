package com.founderlink.team.exception;

@SuppressWarnings("serial")
public class DuplicateInvitationException
        extends RuntimeException {

    public DuplicateInvitationException(String message) {
        super(message);
    }
}