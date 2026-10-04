import { useEffect, useState } from "react";

const parse = (m) => {
  try { return JSON.parse(m.analysisJson); } catch { return {}; }
};

const list = (arr) => (Array.isArray(arr) ? arr : []);

function Chips({ items, tone }) {
  if (!list(items).length) return <p className="muted">None</p>;
  return (
    <div className="chips">
      {items.map((s) => <span key={s} className={`chip ${tone || ""}`}>{s}</span>)}
    </div>
  );
}

function Bullets({ items }) {
  if (!list(items).length) return <p className="muted">None</p>;
  return <ul>{items.map((s, i) => <li key={i}>{s}</li>)}</ul>;
}

export default function App() {
  const [form, setForm] = useState({ candidateName: "", jobTitle: "", jobDescription: "", resumeText: "" });
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const loadHistory = async () => {
    try {
      const res = await fetch("/api/matches");
      setHistory(await res.json());
    } catch {
      setError("Cannot reach the backend. Is it running on port 8080?");
    }
  };
  useEffect(() => { loadHistory(); }, []);

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError("");
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await fetch("/api/resumes/extract", { method: "POST", body: data });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not read the file");
      setForm((f) => ({ ...f, resumeText: json.text }));
    } catch (err) {
      setError(err.message);
    }
    e.target.value = "";
  };

  const analyze = async () => {
    setError("");
    if (!form.resumeText.trim() || !form.jobDescription.trim() || !form.jobTitle.trim()) {
      return setError("Add a job title, the job description, and your resume.");
    }
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Analysis failed");
      setCurrent(json);
      loadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    await fetch(`/api/matches/${id}`, { method: "DELETE" });
    if (current?.id === id) setCurrent(null);
    loadHistory();
  };

  const open = (m) => {
    setCurrent(m);
    setForm({
      candidateName: m.resume.candidateName || "",
      jobTitle: m.jobTitle,
      jobDescription: m.jobDescription,
      resumeText: m.resume.resumeText,
    });
  };

  const a = current ? parse(current) : null;

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>Past matches</h2>
        {history.length === 0 && <p className="muted">Nothing yet. Run your first analysis.</p>}
        {history.map((m) => (
          <div key={m.id} className={`item ${current?.id === m.id ? "active" : ""}`}>
            <button className="item-main" onClick={() => open(m)}>
              <span className="score-pill">{m.matchScore}%</span>
              <strong>{m.jobTitle}</strong>
              <span className="muted">{m.resume.candidateName || "Unnamed"} · {new Date(m.createdAt).toLocaleDateString()}</span>
            </button>
            <button className="del" onClick={() => remove(m.id)} aria-label="Delete match">Delete</button>
          </div>
        ))}
      </aside>

      <main className="main">
        <h1>AI Resume + Job Matcher</h1>
        <p className="muted">See how well your resume fits a job, which skills are missing, and what to change.</p>

        <div className="grid">
          <label>Your name (optional)
            <input value={form.candidateName} onChange={set("candidateName")} />
          </label>
          <label>Job title
            <input value={form.jobTitle} onChange={set("jobTitle")} placeholder="Java Backend Developer" />
          </label>
        </div>

        <label>Job description
          <textarea value={form.jobDescription} onChange={set("jobDescription")} placeholder="Paste the job posting" />
        </label>

        <label>Resume
          <textarea value={form.resumeText} onChange={set("resumeText")} placeholder="Paste your resume text, or upload a file below" />
        </label>

        <div className="row">
          <label className="file">Upload PDF or TXT
            <input type="file" accept=".pdf,.txt" onChange={upload} />
          </label>
          <button className="primary" onClick={analyze} disabled={loading}>
            {loading ? "Analyzing..." : "Match resume"}
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        {a && (
          <section className="result">
            <div className="score">
              <div className="ring" style={{ "--p": current.matchScore }}>
                <span>{current.matchScore}%</span>
              </div>
              <p>{a.summary}</p>
            </div>

            <h3>Matched skills</h3><Chips items={a.matchedSkills} tone="good" />
            <h3>Missing skills</h3><Chips items={a.missingSkills} tone="bad" />
            <h3>Skills found in your resume</h3><Chips items={a.resumeSkills} />
            <h3>Resume improvements</h3><Bullets items={a.resumeImprovements} />
            <h3>Recommendations</h3><Bullets items={a.recommendations} />
          </section>
        )}
      </main>
    </div>
  );
}
