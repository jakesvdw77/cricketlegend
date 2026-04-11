package com.cricketlegend.controller;

import com.cricketlegend.dto.ManagerDTO;
import com.cricketlegend.service.ManagerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/managers")
@PreAuthorize("hasRole('admin')")
@RequiredArgsConstructor
@Tag(name = "Managers", description = "Manager CRUD")
public class ManagerController {

    private final ManagerService managerService;

    @GetMapping
    @Operation(summary = "List all managers")
    public ResponseEntity<List<ManagerDTO>> findAll() {
        return ResponseEntity.ok(managerService.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get manager by ID")
    public ResponseEntity<ManagerDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(managerService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Create a manager")
    public ResponseEntity<ManagerDTO> create(@RequestBody ManagerDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(managerService.create(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a manager")
    public ResponseEntity<ManagerDTO> update(@PathVariable Long id, @RequestBody ManagerDTO dto) {
        return ResponseEntity.ok(managerService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a manager")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        managerService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
