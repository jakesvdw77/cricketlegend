package com.cricketlegend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path uploadDir;
    private final Path proofDir;

    public FileStorageService(@Value("${app.upload-dir:uploads}") String uploadDirPath) throws IOException {
        this.uploadDir = Paths.get(uploadDirPath).toAbsolutePath().normalize();
        this.proofDir  = this.uploadDir.resolve("proof");
        Files.createDirectories(this.uploadDir);
        Files.createDirectories(this.proofDir);
    }

    // ── Public files (logos, photos, media) ───────────────────────────────────

    public String store(MultipartFile file) {
        String storedName = uniqueName(file);
        try {
            Files.copy(file.getInputStream(), uploadDir.resolve(storedName), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Could not store file: " + storedName, e);
        }
        return "/api/v1/files/" + storedName;
    }

    public Resource loadAsResource(String filename) {
        return load(uploadDir, filename);
    }

    public void deleteFile(String url) {
        if (url == null || url.isBlank()) return;
        String filename = url.substring(url.lastIndexOf('/') + 1);
        try { Files.deleteIfExists(uploadDir.resolve(filename).normalize()); }
        catch (IOException e) { throw new RuntimeException("Could not delete file: " + filename, e); }
    }

    // ── Proof-of-payment files (authenticated, restricted) ────────────────────

    public String storeProof(MultipartFile file) {
        String storedName = uniqueName(file);
        try {
            Files.copy(file.getInputStream(), proofDir.resolve(storedName), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Could not store proof file: " + storedName, e);
        }
        return "/api/v1/files/proof/" + storedName;
    }

    public Resource loadProofAsResource(String filename) {
        return load(proofDir, filename);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private String uniqueName(MultipartFile file) {
        String original = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
        String ext = "";
        int dot = original.lastIndexOf('.');
        if (dot >= 0) ext = original.substring(dot).toLowerCase();
        return UUID.randomUUID() + ext;
    }

    private Resource load(Path dir, String filename) {
        try {
            Path filePath = dir.resolve(filename).normalize();
            if (!filePath.startsWith(dir)) throw new RuntimeException("Invalid file path");
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) return resource;
        } catch (MalformedURLException e) {
            throw new RuntimeException("Could not read file: " + filename, e);
        }
        throw new RuntimeException("File not found: " + filename);
    }
}
