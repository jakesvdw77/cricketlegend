package com.cricketlegend.controller;

import com.cricketlegend.service.FileStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
@Tag(name = "Files", description = "File upload and retrieval")
public class FileController {

    private final FileStorageService fileStorageService;

    @PostMapping("/upload")
    @Operation(summary = "Upload a public file (logo, photo, media)")
    public ResponseEntity<Map<String, String>> upload(@RequestParam("file") MultipartFile file) {
        String url = fileStorageService.store(file);
        return ResponseEntity.ok(Map.of("url", url));
    }

    @GetMapping("/{filename:.+}")
    @Operation(summary = "Retrieve a public uploaded file")
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) {
        return buildResponse(fileStorageService.loadAsResource(filename), filename);
    }

    // ── Proof-of-payment endpoints (authentication required) ─────────────────

    @PostMapping("/proof/upload")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Upload a proof-of-payment document (authenticated)")
    public ResponseEntity<Map<String, String>> uploadProof(@RequestParam("file") MultipartFile file) {
        String url = fileStorageService.storeProof(file);
        return ResponseEntity.ok(Map.of("url", url));
    }

    @GetMapping("/proof/{filename:.+}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Retrieve a proof-of-payment document (authenticated)")
    public ResponseEntity<Resource> serveProofFile(@PathVariable String filename) {
        return buildResponse(fileStorageService.loadProofAsResource(filename), filename);
    }

    // ── helper ────────────────────────────────────────────────────────────────

    private ResponseEntity<Resource> buildResponse(Resource resource, String filename) {
        String contentType = "application/octet-stream";
        try {
            contentType = Files.probeContentType(Path.of(filename));
            if (contentType == null) contentType = "application/octet-stream";
        } catch (Exception ignored) {}
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .header("X-Content-Type-Options", "nosniff")
                .header("Cache-Control", "no-store")
                .body(resource);
    }
}
