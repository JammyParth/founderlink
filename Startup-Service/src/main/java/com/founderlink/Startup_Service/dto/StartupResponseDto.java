package com.founderlink.Startup_Service.dto;

import lombok.Data;

@Data
public class StartupResponseDto {

    private Long id;
    private String name;
    private String description;
    private String industry;
    private String solution;
    private Double fundingGoal;
    private String stage;
    private Long founderId;
}
