package com.founderlink.Startup_Service.entity;

import ch.qos.logback.core.status.Status;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "startup")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class Startup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;
    private String industry;
    private String problemStatement;
    private String solution;
    private Double fundingGoal;

    @Enumerated(EnumType.STRING)
    private Stage stage;

    private Long founderId;

    public enum Stage {
        IDEA, MVP, EARLY_TRACTION, SCALING
    }


}
