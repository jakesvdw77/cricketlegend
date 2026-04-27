package com.cricketlegend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
public class CricketLegendApplication {

    public static void main(String[] args) {
        SpringApplication.run(CricketLegendApplication.class, args);
    }

}
