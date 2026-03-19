package com.founderlink.team.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.founderlink.team.dto.request.InvitationRequestDto;
import com.founderlink.team.dto.response.InvitationResponseDto;
import com.founderlink.team.service.InvitationService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/teams")
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationService invitationService;

    // SEND INVITATION
    // POST /teams/invite
    // Called by → FOUNDER
    
    @PostMapping("/invite")
    public ResponseEntity<InvitationResponseDto> sendInvitation(
            @RequestHeader("X-User-Id") Long founderId,
            @RequestHeader("X-User-Role") String userRole,
            @Valid @RequestBody InvitationRequestDto requestDto) {

        // Only founder can send invitation
        if (!userRole.equals("ROLE_FOUNDER")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        InvitationResponseDto response = invitationService
                .sendInvitation(founderId, requestDto);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    // CANCEL INVITATION
    // PUT /teams/invitations/{id}/cancel
    // Called by → FOUNDER
    
    @PutMapping("/invitations/{id}/cancel")
    public ResponseEntity<InvitationResponseDto> cancelInvitation(
            @RequestHeader("X-User-Id") Long founderId,
            @RequestHeader("X-User-Role") String userRole,
            @PathVariable Long id) {

        // Only founder can cancel
        if (!userRole.equals("ROLE_FOUNDER")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        InvitationResponseDto response = invitationService
                .cancelInvitation(id, founderId);

        return ResponseEntity.ok(response);
    }
    
    // REJECT INVITATION
    // PUT /teams/invitations/{id}/reject
    // Called by → CO-FOUNDER
    
    @PutMapping("/invitations/{id}/reject")
    public ResponseEntity<InvitationResponseDto> rejectInvitation(
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String userRole,
            @PathVariable Long id) {

        // Only co-founder can reject
        if (!userRole.equals("ROLE_COFOUNDER")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        InvitationResponseDto response = invitationService
                .rejectInvitation(id, userId);

        return ResponseEntity.ok(response);
    }

    // GET INVITATIONS BY USER ID
    // GET /teams/invitations/user/{userId}
    // Called by → CO-FOUNDER
    
    @GetMapping("/invitations/user")
    public ResponseEntity<List<InvitationResponseDto>> getInvitationsByUserId(
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String userRole) {

        // Only co-founder can view their invitations
        if (!userRole.equals("ROLE_COFOUNDER")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<InvitationResponseDto> response = invitationService
                .getInvitationsByUserId(userId);

        return ResponseEntity.ok(response);
    }
    
    // GET INVITATIONS BY STARTUP ID
    // GET /teams/invitations/startup/{startupId}
    // Called by → FOUNDER
    
    @GetMapping("/invitations/startup/{startupId}")
    public ResponseEntity<List<InvitationResponseDto>> getInvitationsByStartupId(
            @RequestHeader("X-User-Role") String userRole,
            @PathVariable Long startupId) {

        // Only founder can view startup invitations
        if (!userRole.equals("ROLE_FOUNDER")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<InvitationResponseDto> response = invitationService
                .getInvitationsByStartupId(startupId);

        return ResponseEntity.ok(response);
    }
}