package com.cricketlegend.repository;

import com.cricketlegend.domain.UserLoginEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserLoginEventRepository extends JpaRepository<UserLoginEvent, Long> {

    @Query("SELECT e FROM UserLoginEvent e WHERE LOWER(e.firstName) LIKE LOWER(CONCAT('%', :name, '%')) OR LOWER(e.lastName) LIKE LOWER(CONCAT('%', :name, '%'))")
    Page<UserLoginEvent> findByNameFilter(@Param("name") String name, Pageable pageable);
}
