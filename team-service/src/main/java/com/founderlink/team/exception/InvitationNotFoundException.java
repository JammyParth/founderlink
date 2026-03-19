package com.founderlink.team.exception;

@SuppressWarnings("serial")
public class InvitationNotFoundException
        extends RuntimeException {

    public InvitationNotFoundException(String message) {
        super(message);
    }
}