package com.resumematcher.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.resumematcher.dto.AnalyzeRequest;
import com.resumematcher.model.MatchResult;
import com.resumematcher.model.Resume;
import com.resumematcher.repository.MatchResultRepository;
import com.resumematcher.repository.ResumeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class AnalysisService {

    private final ResumeRepository resumes;
    private final MatchResultRepository matches;
    private final GeminiService gemini;
    private final ObjectMapper mapper = new ObjectMapper();

    public AnalysisService(ResumeRepository resumes, MatchResultRepository matches, GeminiService gemini) {
        this.resumes = resumes;
        this.matches = matches;
        this.gemini = gemini;
    }

    @Transactional
    public MatchResult analyze(AnalyzeRequest req) {
        String json;
        JsonNode node;
        try {
            json = gemini.analyze(req.getResumeText(), req.getJobTitle(), req.getJobDescription());
            node = mapper.readTree(json.replaceAll("```json|```", "").trim());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI analysis failed: " + e.getMessage());
        }

        Resume resume = new Resume();
        String aiName = node.path("candidateName").asText("");
        resume.setCandidateName(notBlank(req.getCandidateName()) ? req.getCandidateName() : aiName);
        resume.setResumeText(req.getResumeText());
        resume.setExtractedSkills(node.path("resumeSkills").toString());
        resumes.save(resume);

        MatchResult result = new MatchResult();
        result.setResume(resume);
        result.setJobTitle(req.getJobTitle());
        result.setJobDescription(req.getJobDescription());
        result.setMatchScore(Math.max(0, Math.min(100, node.path("matchScore").asInt(0))));
        result.setAnalysisJson(node.toString());
        return matches.save(result);
    }

    public List<MatchResult> history() {
        return matches.findAllByOrderByCreatedAtDesc();
    }

    public MatchResult get(Long id) {
        return matches.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Result not found"));
    }

    @Transactional
    public void delete(Long id) {
        MatchResult m = get(id);
        matches.delete(m);
        resumes.delete(m.getResume());
    }

    private boolean notBlank(String s) { return s != null && !s.isBlank(); }
}
