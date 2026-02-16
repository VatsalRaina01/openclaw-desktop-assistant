import React, { useState } from "react";
import { useAppContext } from "../context/AppContext";

function SandboxView() {
    const { sandboxMode, dispatch, agents, addLog, addToast } = useAppContext();
    const [simulationResults, setSimulationResults] = useState([]);
    const [isRunning, setIsRunning] = useState(false);

    const handleToggleSandbox = () => {
        dispatch({ type: "TOGGLE_SANDBOX" });
        const newMode = !sandboxMode;
        addLog(
            newMode ? "warn" : "success",
            `Sandbox mode ${newMode ? "enabled" : "disabled"}`,
            "sandbox"
        );
        addToast(
            newMode ? "Sandbox mode enabled 🧪" : "Sandbox mode disabled — agents go live 🟢",
            newMode ? "warning" : "success"
        );
    };

    const handleDryRun = async (agent) => {
        setIsRunning(true);
        addLog("info", `Sandbox dry-run started for "${agent.name}"`, "sandbox");

        // Simulate steps with delays
        const steps = [
            { step: "Initializing agent...", delay: 600, status: "running" },
            { step: `Loading tools: ${agent.tools.join(", ")}`, delay: 500, status: "running" },
            { step: "Connecting to browser (simulated)...", delay: 800, status: "running" },
            {
                step: agent.name.includes("Trending")
                    ? "Searching for trending OpenClaw topics (simulated)..."
                    : "Searching LinkedIn for #openclaw posts (simulated)...",
                delay: 1000,
                status: "running",
            },
            {
                step: agent.name.includes("Trending")
                    ? "Found 5 trending topics. Generating LinkedIn post draft..."
                    : "Found 3 posts with #openclaw. Generating comments...",
                delay: 800,
                status: "running",
            },
            {
                step: agent.name.includes("Trending")
                    ? "📝 Draft post generated. Waiting for user approval..."
                    : "💬 Comments generated for 3 posts.",
                delay: 500,
                status: "running",
            },
            {
                step: "✅ Dry run complete — no real actions performed.",
                delay: 300,
                status: "completed",
            },
        ];

        const results = [];
        for (const s of steps) {
            await new Promise((r) => setTimeout(r, s.delay));
            results.push({
                ...s,
                timestamp: new Date().toISOString(),
            });
            setSimulationResults([...results]);
        }

        addLog("success", `Sandbox dry-run completed for "${agent.name}"`, "sandbox");
        addToast(`Dry run complete for ${agent.name} ✅`, "success");
        setIsRunning(false);
    };

    return (
        <>
            <div className="content-header">
                <div className="header-title">
                    <span>🧪</span> Sandbox Mode
                </div>
                <div className="header-actions">
                    <button
                        className={`btn btn-sm ${sandboxMode ? "btn-danger" : "btn-success"}`}
                        onClick={handleToggleSandbox}
                    >
                        {sandboxMode ? "🔴 Disable Sandbox" : "🟢 Enable Sandbox"}
                    </button>
                </div>
            </div>

            {sandboxMode && (
                <div className="sandbox-banner">
                    🧪 Sandbox Mode Active — All actions are simulated
                </div>
            )}

            <div className="page-view">
                <h2 className="page-title">Sandbox Testing</h2>
                <p className="page-subtitle">
                    Test your agents safely. Sandbox mode simulates all actions without making real changes — no posts, no comments, no side effects.
                </p>

                {/* Sandbox Status Card */}
                <div className="settings-section">
                    <h3>{sandboxMode ? "🧪" : "🟢"} Sandbox Status</h3>
                    <div style={{
                        padding: "16px",
                        borderRadius: "10px",
                        background: sandboxMode ? "rgba(245, 158, 11, 0.06)" : "rgba(16, 185, 129, 0.06)",
                        border: `1px solid ${sandboxMode ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)"}`,
                        marginTop: "8px",
                    }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <div>
                                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>Mode</div>
                                <div style={{ fontWeight: 600, color: sandboxMode ? "var(--accent-warning)" : "var(--accent-success)" }}>
                                    {sandboxMode ? "🧪 Sandbox (Safe)" : "🟢 Live (Real Actions)"}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>Browser Actions</div>
                                <div style={{ fontWeight: 600 }}>
                                    {sandboxMode ? "Simulated" : "Real"}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>Posts & Comments</div>
                                <div style={{ fontWeight: 600 }}>
                                    {sandboxMode ? "Not Published" : "Published"}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>Logging</div>
                                <div style={{ fontWeight: 600, color: "var(--accent-success)" }}>
                                    Always Active ✅
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dry Run Section */}
                <div className="settings-section">
                    <h3>⚡ Dry Run Agents</h3>
                    <p style={{ color: "var(--text-tertiary)", fontSize: "13px", marginBottom: "16px" }}>
                        Select an agent to simulate its full execution flow. See exactly what would happen without any real side effects.
                    </p>

                    {agents.length === 0 ? (
                        <div className="empty-state" style={{ padding: "24px" }}>
                            <p>No agents to test. Create an agent first.</p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {agents.map((agent) => (
                                <div key={agent.id} style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "12px 16px",
                                    background: "var(--bg-glass)",
                                    borderRadius: "10px",
                                    border: "1px solid var(--border-secondary)",
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: "14px" }}>{agent.name}</div>
                                        <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{agent.role}</div>
                                    </div>
                                    <button
                                        className="btn btn-sm btn-primary"
                                        onClick={() => handleDryRun(agent)}
                                        disabled={isRunning}
                                    >
                                        {isRunning ? (
                                            <><span className="spinner" style={{ width: "12px", height: "12px" }} /> Running...</>
                                        ) : (
                                            "▶️ Dry Run"
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Simulation Results */}
                {simulationResults.length > 0 && (
                    <div className="settings-section">
                        <h3>📊 Simulation Results</h3>
                        <div className="setup-progress">
                            {simulationResults.map((result, i) => (
                                <div key={i} className={`progress-step ${result.status === "completed" ? "completed" : "active"}`}>
                                    <div className="progress-step-icon">
                                        {result.status === "completed" ? "✓" : i + 1}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: "13px" }}>{result.step}</div>
                                        <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                                            {new Date(result.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            className="btn btn-sm btn-secondary"
                            style={{ marginTop: "12px" }}
                            onClick={() => setSimulationResults([])}
                        >
                            Clear Results
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}

export default SandboxView;
