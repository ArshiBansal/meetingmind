import { useState } from "react";

const API_URL = "https://api.anthropic.com/v1/messages";

async function callClaude(transcript) {
  const prompt = `You are an expert meeting analyst. Analyze the following meeting transcript and provide a structured summary.

Respond in this EXACT format:

OVERVIEW:
[2-4 sentences summarizing what the meeting was about and the main topics covered]

KEY DECISIONS:
- [Decision 1]
- [Decision 2]

ACTION ITEMS:
- [Person (if mentioned): what they need to do, by when (if mentioned)]

Be concise and professional. If no clear decisions or action items found, write "None identified."

TRANSCRIPT:
${transcript}`;

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) throw new Error("API call failed");
  const data = await response.json();
  return data.content.map((b) => b.text || "").join("");
}

function parseResult(text) {
  const overviewMatch = text.match(/OVERVIEW:\s*([\s\S]*?)(?=KEY DECISIONS:|$)/i);
  const decisionsMatch = text.match(/KEY DECISIONS:\s*([\s\S]*?)(?=ACTION ITEMS:|$)/i);
  const actionsMatch = text.match(/ACTION ITEMS:\s*([\s\S]*?)$/i);
  return {
    overview: overviewMatch ? overviewMatch[1].trim() : "Could not parse.",
    decisions: decisionsMatch ? decisionsMatch[1].trim() : "None identified.",
    actions: actionsMatch ? actionsMatch[1].trim() : "None identified.",
  };
}

function parseLines(text) {
  return text.split("\n").map((l) => l.trim()).filter((l) => l && l !== "-");
}

function Card({ label, content, isList }) {
  const [copied, setCopied] = useState(false);
  const lines = isList ? parseLines(content) : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{
      background: "#161618",
      border: "1px solid #2a2a2e",
      borderRadius: 6,
      marginBottom: 16,
      overflow: "hidden",
      transition: "border-color 0.2s",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px", borderBottom: "1px solid #2a2a2e",
      }}>
        <span style={{
          fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase",
          color: "#c8f05a", display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ width: 6, height: 6, background: "#c8f05a", borderRadius: "50%", display: "inline-block" }} />
          {label}
        </span>
        <button onClick={handleCopy} style={{
          background: "none", border: "none", color: "#6b6b72",
          fontFamily: "monospace", fontSize: 10, cursor: "pointer",
        }}>
          {copied ? "copied!" : "copy"}
        </button>
      </div>
      <div style={{ padding: 18, fontSize: 13, lineHeight: 1.8, color: "#e8e8e2" }}>
        {isList && lines.length > 0 && !lines[0].toLowerCase().includes("none") ? (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {lines.map((line, i) => (
              <li key={i} style={{
                padding: "6px 0", borderBottom: i < lines.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                display: "flex", gap: 10,
              }}>
                <span style={{ color: "#c8f05a", flexShrink: 0 }}>→</span>
                {line.replace(/^[-•*]\s*/, "")}
              </li>
            ))}
          </ul>
        ) : (
          <span>{isList ? (lines[0] || "None identified.") : content}</span>
        )}
      </div>
    </div>
  );
}

export default function MeetingMind() {
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState("");
  const [allCopied, setAllCopied] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setTranscript(ev.target.result);
      setFileName(file.name);
    };
    reader.readAsText(file);
  };

  const summarize = async () => {
    if (!transcript.trim()) return setError("Please paste a meeting transcript first.");
    if (transcript.trim().length < 50) return setError("Transcript is too short.");
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const text = await callClaude(transcript);
      setResult(parseResult(text));
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyAll = () => {
    if (!result) return;
    const full = `OVERVIEW:\n${result.overview}\n\nKEY DECISIONS:\n${result.decisions}\n\nACTION ITEMS:\n${result.actions}`;
    navigator.clipboard.writeText(full);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 1500);
  };

  return (
    <div style={{
      background: "#0e0e0f", minHeight: "100vh", color: "#e8e8e2",
      fontFamily: "'DM Mono', 'Courier New', monospace",
      backgroundImage: "linear-gradient(rgba(200,240,90,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(200,240,90,0.03) 1px, transparent 1px)",
      backgroundSize: "40px 40px",
    }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "60px 24px 100px" }}>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            display: "inline-block", background: "rgba(200,240,90,0.12)",
            border: "1px solid rgba(200,240,90,0.3)", color: "#c8f05a",
            fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
            padding: "4px 10px", borderRadius: 2, marginBottom: 16,
          }}>
            No API Key Needed
          </div>
          <div style={{ fontSize: "clamp(36px, 6vw, 58px)", fontWeight: 400, lineHeight: 1.1, marginBottom: 10 }}>
            Meeting<span style={{ color: "#c8f05a", fontStyle: "italic" }}>Mind</span>
          </div>
          <p style={{ color: "#6b6b72", fontSize: 13 }}>
            Paste your transcript → get a clean summary, decisions & action items.
          </p>
        </div>

        {/* Textarea */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
            color: "#6b6b72", marginBottom: 8, display: "block",
          }}>Meeting Transcript</label>
          <div style={{ position: "relative" }}>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={"Paste your meeting transcript here...\n\nExample:\nJohn: Let's kick off Q3 planning...\nSarah: I'll handle the marketing budget..."}
              style={{
                width: "100%", background: "#161618", border: "1px solid #2a2a2e",
                color: "#e8e8e2", fontFamily: "inherit", fontSize: 13,
                lineHeight: 1.7, padding: 20, borderRadius: 4, resize: "vertical",
                minHeight: 220, outline: "none",
              }}
            />
            <span style={{
              position: "absolute", bottom: 12, right: 14,
              fontSize: 10, color: "#6b6b72", pointerEvents: "none",
            }}>
              {transcript.length.toLocaleString()} chars
            </span>
          </div>

          {/* Upload */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
            <label style={{
              background: "none", border: "1px dashed #2a2a2e", color: "#6b6b72",
              fontSize: 11, padding: "8px 14px", borderRadius: 4, cursor: "pointer",
              transition: "all 0.2s",
            }}>
              ↑ Upload .txt file
              <input type="file" accept=".txt" onChange={handleFile} style={{ display: "none" }} />
            </label>
            {fileName && <span style={{ fontSize: 11, color: "#6b6b72" }}>{fileName}</span>}
          </div>
        </div>

        {/* Button */}
        <div style={{ marginBottom: 48 }}>
          <button
            onClick={summarize}
            disabled={loading}
            style={{
              width: "100%", background: loading ? "#7a9435" : "#c8f05a",
              color: "#0e0e0f", border: "none", fontFamily: "inherit",
              fontWeight: 500, fontSize: 13, letterSpacing: "0.12em",
              textTransform: "uppercase", padding: 16, borderRadius: 4,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: 16, height: 16, border: "2px solid rgba(0,0,0,0.2)",
                  borderTopColor: "#0e0e0f", borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 0.7s linear infinite",
                }} />
                Analyzing...
              </>
            ) : "✦ Summarize Meeting"}
          </button>

          {error && (
            <div style={{
              background: "rgba(255,95,95,0.08)", border: "1px solid rgba(255,95,95,0.3)",
              color: "#ff5f5f", fontSize: 12, padding: "12px 16px", borderRadius: 4, marginTop: 12,
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #2a2a2e",
            }}>
              <span style={{ fontSize: 22, fontWeight: 400 }}>Summary</span>
              <button onClick={copyAll} style={{
                background: "none", border: "1px solid #2a2a2e", color: "#6b6b72",
                fontFamily: "inherit", fontSize: 10, letterSpacing: "0.1em",
                textTransform: "uppercase", padding: "6px 12px", borderRadius: 3, cursor: "pointer",
              }}>
                {allCopied ? "Copied!" : "Copy All"}
              </button>
            </div>
            <Card label="Overview" content={result.overview} isList={false} />
            <Card label="Key Decisions" content={result.decisions} isList={true} />
            <Card label="Action Items" content={result.actions} isList={true} />
          </div>
        )}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
