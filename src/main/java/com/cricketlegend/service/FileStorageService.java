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

    public FileStorageService(@Value("${app.upload-dir:uploads}") String uploadDirPath) throws IOException {
        this.uploadDir = Paths.get(uploadDirPath).toAbsolutePath().normalize();
        Files.createDirectories(this.uploadDir);
    }

    public String store(MultipartFile file) {
        String original = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
        String ext = "";
        int dot = original.lastIndexOf('.');
        if (dot >= 0) ext = original.substring(dot);
        String storedName = UUID.randomUUID() + ext;
        try {
            Files.copy(file.getInputStream(), uploadDir.resolve(storedName), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Could not store file: " + original, e);
        }
        return "/api/v1/files/" + storedName;
    }

    public Resource loadAsResource(String filename) {
        try {
            Path filePath = uploadDir.resolve(filename).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) return resource;
        } catch (MalformedURLException e) {
            throw new RuntimeException("Could not read file: " + filename, e);
        }
        throw new RuntimeException("File not found: " + filename);
    }
}
