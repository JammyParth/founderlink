package com.founderlink.team.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.founderlink.team.entity.TeamMember;
import com.founderlink.team.entity.TeamRole;

@Repository
public interface TeamMemberRepository
        extends JpaRepository<TeamMember, Long> {

    // Get all members of a startup
    // GET /teams/startup/{startupId}

    List<TeamMember> findByStartupId(Long startupId);

    // Edge case → prevent duplicate membership

    boolean existsByStartupIdAndUserId(
            Long startupId,
            Long userId);


    // Edge case → prevent duplicate roles in team
    // CTO already exists → block another CTO
    
    boolean existsByStartupIdAndRole(
            Long startupId,
            TeamRole role);

    
    // Find specific member in startup
    // Used in DELETE operation
    
    Optional<TeamMember> findByStartupIdAndUserId(
            Long startupId,
            Long userId);
}