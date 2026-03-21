package com.cricketlegend.controller;

import com.cricketlegend.dto.FieldDTO;
import com.cricketlegend.service.FieldService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/fields")
@RequiredArgsConstructor
@Tag(name = "Fields", description = "Cricket field management endpoints")
public class FieldController {

    private final FieldService fieldService;

    @GetMapping
    @Operation(summary = "Get all fields")
    public ResponseEntity<List<FieldDTO>> findAll() {
        return ResponseEntity.ok(fieldService.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get field by ID")
    public ResponseEntity<FieldDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(fieldService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Create a field")
    public ResponseEntity<FieldDTO> create(@RequestBody FieldDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(fieldService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Update a field")
    public ResponseEntity<FieldDTO> update(@PathVariable Long id, @RequestBody FieldDTO dto) {
        return ResponseEntity.ok(fieldService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Delete a field")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        fieldService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
