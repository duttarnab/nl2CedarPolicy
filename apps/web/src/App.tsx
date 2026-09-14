import Editor from "@monaco-editor/react";
import { useEffect, useState } from "react";
import { generatePolicy, getHealth, type HealthData, type ProviderId, type ResponseData } from "./api";

const DEFAULT_SCHEMA = `namespace App {

    entity User {
        role: String,
        department: String
    };

    entity Document {
        owner: User,
        department: String
    };

    action "Read" appliesTo {
        principal: User,
        resource: Document
    };

    action "Write" appliesTo {
        principal: User,
        resource: Document
    };
}`;

const DEFAULT_REQUIREMENT =
  "Users can read documents belonging to their own department. Developers can also write documents in their department.";

function EditorBox(props: {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <Editor
      height="430px"
      language="plaintext"
      theme="vs-dark"
      value={props.value}
      onChange={v => props.onChange?.(v ?? "")}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        readOnly: props.readOnly ?? false,
        wordWrap: "on"
      }}
    />
  );
}

function App() {
  const [schema, setSchema] = useState(DEFAULT_SCHEMA);
  const [requirement, setRequirement] = useState(DEFAULT_REQUIREMENT);
  const [policy, setPolicy] = useState("");
  const [result, setResult] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState<HealthData | null>(null);
  const [provider, setProvider] = useState<ProviderId>("mock");

  useEffect(() => {
    getHealth()
      .then(data => {
        setHealth(data);
        setProvider(data.defaultProvider);
      })
      .catch(e => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const data = await generatePolicy(schema, requirement, provider);
      setPolicy(data.policy);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 1500, margin: "0 auto", padding: 24 }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start" }}>
          <div>
            <h1 style={{ marginBottom: 6 }}>AI Cedar Policy Studio</h1>
            <p style={{ color: "#6b7280", marginTop: 0 }}>
              Natural language → Cedar policy → deterministic validation → semantic review
            </p>
          </div>
          <ProviderStatus health={health} provider={provider} onChange={setProvider} />
        </div>
      </header>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 16
      }}>
        <Panel title="1. Cedar Schema">
          <EditorBox value={schema} onChange={setSchema} />
        </Panel>

        <Panel title="2. Authorization Requirement">
          <textarea
            value={requirement}
            onChange={e => setRequirement(e.target.value)}
            style={{
              width: "100%", height: 430, padding: 16,
              resize: "none", borderRadius: 8,
              border: "1px solid #d1d5db", fontSize: 14
            }}
          />
          <button
            onClick={generate}
            disabled={loading}
            style={{
              width: "100%", marginTop: 12, padding: 13,
              border: 0, borderRadius: 8,
              background: "#111827", color: "white",
              fontWeight: 700
            }}
          >
            {loading ? "Generating..." : "Generate Cedar Policy"}
          </button>
        </Panel>

        <Panel title="3. Generated Policy">
          <EditorBox value={policy} readOnly />
        </Panel>
      </div>

      {error && (
        <div style={{ marginTop: 16, padding: 16, background: "#fee2e2", borderRadius: 8 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{
          marginTop: 16, display: "grid",
          gridTemplateColumns: "1fr 1fr", gap: 16
        }}>
          <StatusCard
            title={`LLM Provider · ${result.provider}`}
            ok={true}
            body={health?.providers.find(p => p.id === result.provider)?.model ?? result.provider}
          />

          <StatusCard
            title="Cedar Validation"
            ok={result.validation.valid}
            body={
              result.validation.valid
                ? "Policy is valid against the supplied schema."
                : result.validation.diagnostics.map(d => d.message).join("\n")
            }
          />

          <StatusCard
            title={`Semantic Verification · ${result.provider}`}
            ok={result.verification.valid}
            body={`${result.verification.summary}\n\nConfidence: ${(result.verification.confidence * 100).toFixed(0)}%`}
          />

          <StatusCard
            title="Repair LLM"
            ok={result.verification.valid}
            body={result.repair.attempts === 0
              ? `No repair was needed. Repair loop is ${result.repair.enabled ? "enabled" : "disabled"}.`
              : `${result.repair.repaired ? "Policy repaired." : "Repair attempts exhausted."}\n\nAttempts: ${result.repair.attempts}/${result.repair.maxAttempts}\nFinal status: ${result.verification.valid ? "valid" : "still failing"}`}
          />

          {result.repair.history.length > 0 && (
            <div style={{
              gridColumn: "1 / -1", background: "white", borderRadius: 10,
              padding: 20, border: "1px solid #e5e7eb"
            }}>
              <h3>Repair History</h3>
              {result.repair.history.map(item => (
                <div key={item.attempt} style={{ padding: 12, marginTop: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}>
                  <strong>Attempt {item.attempt}: {item.verification.valid ? "✓ repaired" : "✕ still invalid"}</strong>
                  <div style={{ marginTop: 5, color: "#4b5563" }}>{item.verification.summary}</div>
                </div>
              ))}
            </div>
          )}

          {result.verification.issues.length > 0 && (
            <div style={{
              gridColumn: "1 / -1",
              background: "white",
              borderRadius: 10,
              padding: 20,
              border: "1px solid #e5e7eb"
            }}>
              <h3>Issues</h3>
              {result.verification.issues.map((issue, i) => (
                <div key={i} style={{
                  padding: 12, marginTop: 8,
                  border: "1px solid #e5e7eb", borderRadius: 8
                }}>
                  <strong>{issue.severity.toUpperCase()} — {issue.type}</strong>
                  <div style={{ marginTop: 5 }}>{issue.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProviderStatus(props: {
  health: HealthData | null;
  provider: ProviderId;
  onChange: (provider: ProviderId) => void;
}) {
  const selected = props.health?.providers.find(p => p.id === props.provider);

  return (
    <div style={{
      minWidth: 300, padding: 14, background: "#f9fafb",
      border: "1px solid #e5e7eb", borderRadius: 10
    }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>LLM Provider</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <select
          value={props.provider}
          onChange={e => props.onChange(e.target.value as ProviderId)}
          style={{ flex: 1, padding: "8px 10px", borderRadius: 7, border: "1px solid #d1d5db" }}
        >
          {(props.health?.providers ?? [
            { id: "mock" as const, label: "Mock", model: "local-demo", configured: true }
          ]).map(item => (
            <option key={item.id} value={item.id} disabled={!item.configured}>
              {item.label}{item.configured ? "" : " (not configured)"}
            </option>
          ))}
        </select>
        <span style={{
          fontSize: 11, padding: "4px 7px", borderRadius: 999,
          background: selected?.configured ? "#dcfce7" : "#fee2e2",
          color: selected?.configured ? "#166534" : "#991b1b"
        }}>
          {selected?.configured ? "Ready" : "Not configured"}
        </span>
      </div>
      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 7 }}>
        Model: {selected?.model ?? "local-demo"}
      </div>
    </div>
  );
}

function Panel(props: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: "white",
      padding: 16,
      borderRadius: 10,
      border: "1px solid #e5e7eb"
    }}>
      <h2 style={{ fontSize: 16, marginTop: 0 }}>{props.title}</h2>
      {props.children}
    </section>
  );
}

function StatusCard(props: { title: string; ok: boolean; body: string }) {
  return (
    <div style={{
      background: "white",
      borderRadius: 10,
      padding: 20,
      border: `1px solid ${props.ok ? "#86efac" : "#fca5a5"}`
    }}>
      <h3 style={{ marginTop: 0 }}>
        {props.ok ? "✓" : "✕"} {props.title}
      </h3>
      <pre style={{
        whiteSpace: "pre-wrap",
        fontFamily: "inherit",
        color: "#4b5563"
      }}>{props.body}</pre>
    </div>
  );
}

export default App;