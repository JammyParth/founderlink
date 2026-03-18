package com.founderlink.Startup_Service.repository;

import com.founderlink.Startup_Service.entity.Startup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StartupRepository extends JpaRepository<Startup, Long> {

    List<Startup> findByIndustryContainingAndStageAndFundingGoalLessThanEqual(
            String industry,
            Startup.Stage stage,
            Double fundingGoal
    );
}
