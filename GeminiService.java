package com.resumematcher.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    private final RestClient client;
    private final String apiKey;
    private final String model;

    public GeminiService(@Value("${gemini.api.key}") String apiKey,
                         @Value("${gemini.api.model}") String model,
                         @Value("${gemini.api.url}") String baseUrl) {
        this.apiKey = apiKey;
        this.model = model;
        this.client = RestClient.builder().baseUrl(baseUrl).build();
    }

    /** Returns the AI analysis as a JSON string. */
    public String analyze(String resumeText, String jobTitle, String jobDescription) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("GEMINI_API_KEY is not configured");
        }

        String prompt = """
                You are an expert technical recruiter and career coach.
                Compare the RESUME to the JOB DESCRIPTION for the role "%s".
                Respond ONLY with JSON in exactly this shape:
                {
                  "candidateName": "string, or Unknown",
                  "resumeSkills": ["skills found in the resume"],
                  "requiredSkills": ["skills the job requires"],
                  "matchedSkills": ["required skills the candidate has"],
                  "missingSkills": ["required skills the candidate lacks"],
                  "matchScore": 0,
                  "summary": "2-3 sentence overall assessment",
                  "resumeImprovements": ["specific, actionable edits to the resume for this job"],
                  "recommendations": ["skills, projects or courses to close the gaps"]
                }
                matchScore is an integer from 0 to 100. Only use facts present in the resume.

                RESUME:
                %s

                JOB DESCRIPTION:
                %s
                """.formatted(jobTitle, resumeText, jobDescription);

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of("responseMimeType", "application/json"));

        JsonNode response = client.post()
                .uri("/{model}:generateContent", model)
                .header("x-goog-api-key", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(JsonNode.class);

        JsonNode text = response == null ? null
                : response.at("/candidates/0/content/parts/0/text");
        if (text == null || text.isMissingNode()) {
            throw new IllegalStateException("Gemini returned no analysis");
        }
        return text.asText();
    }
}
