package com.founderlink.team.exception;

@SuppressWarnings("serial")
public class TeamMemberNotFoundException
        extends RuntimeException {

    public TeamMemberNotFoundException(String message) {
        super(message);
    }
}