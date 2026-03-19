package com.founderlink.team.exception;

@SuppressWarnings("serial")
public class AlreadyTeamMemberException
        extends RuntimeException {

    public AlreadyTeamMemberException(String message) {
        super(message);
    }
}