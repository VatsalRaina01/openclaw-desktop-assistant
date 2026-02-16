import React, { useState } from "react";
import { useAppContext } from "../context/AppContext";

function SettingsView() {
    const { llmConfig, dispatch, addLog, addToast } = useAppContext();
    const [localConfig, setLocalConfig] = useState({ ...llmConfig });
    const [showKey, setShowKey] = useState(false);

    const handleSave = () => {
        // Determine mode based on API key presence
        const mode = localConfig.apiKey ? "api" : "local";
        const updatedConfig = { ...localConfig, mode };

        dispatch({ type: "UPDATE_LLM_CONFIG", payload: updatedConfig });

        if (mode === "api") {
            addLog("llm", `Switched to API mode: ${localConfig.apiProvider} / ${localConfig.apiModel}`, "llm-router");
            addToast(`Switched to ${localConfig.apiProvider.toUpperCase()} API 🌐`, "success");
        } else {
            addLog("llm", "Switched to local mode (Phi-3 built-in engine)", "llm-router");
            addToast("Using local LLM engine ⚡", "info");
        }
    };

    const handleClearKey = () => {
        setLocalConfig({ ...localConfig, apiKey: "", mode: "local" });
        dispatch({ type: "UPDATE_LLM_CONFIG", payload: { apiKey: "", mode: "local" } });
        addLog("llm", "API key cleared — switched back to local mode", "llm-router");
        addToast("Switched back to local LLM ⚡", "info");
    };

    const providers = [
        { value: "openai", label: "OpenAI", models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"] },
        { value: "github", label: "GitHub Models", models: ["gpt-4o", "gpt-4o-mini", "Phi-3-medium-4k-instruct", "Phi-3-mini-4k-instruct"] },
        { value: "anthropic", label: "Anthropic", models: ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-haiku-20240307"] },
        { value: "custom", label: "Custom (OpenAI-compatible)", models: ["custom-model"] },
    ];

    const selectedProvider = providers.find((p) => p.value === localConfig.apiProvider) || providers[0];

    return (
        <>
            <div className="content-header">
                <div className="header-title">
                    <span>⚙️</span> Settings
                </div>
            </div>

            <div className="page-view">
                <h2 className="page-title">Configuration</h2>
                <p className="page-subtitle">
                    Manage your LLM settings, API keys, and application preferences.
                </p>

                {/* LLM Configuration */}
                <div className="settings-section">
                    <h3>🧠 LLM Configuration</h3>
                    <p style={{ color: "var(--text-tertiary)", fontSize: "13px", marginBottom: "16px" }}>
                        The app uses a <strong>local built-in engine</strong> by default. Add your API key to switch
                        to a more powerful external model. The switch is automatic.
                    </p>

                    {/* Current Mode Banner */}
                    <div style={{
                        padding: "12px 16px",
                        borderRadius: "10px",
                        marginBottom: "16px",
                        background: llmConfig.mode === "api" && llmConfig.apiKey
                            ? "rgba(16, 185, 129, 0.08)"
                            : "rgba(245, 158, 11, 0.08)",
                        border: `1px solid ${llmConfig.mode === "api" && llmConfig.apiKey
                            ? "rgba(16, 185, 129, 0.2)"
                            : "rgba(245, 158, 11, 0.2)"}`,
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                    }}>
                        <div className={`llm-status-dot ${llmConfig.mode === "api" && llmConfig.apiKey ? "api" : "local"}`}
                            style={{ width: "10px", height: "10px" }} />
                        <div>
                            <div style={{ fontWeight: 600, fontSize: "13px" }}>
                                {llmConfig.mode === "api" && llmConfig.apiKey
                                    ? `🌐 API Mode — ${llmConfig.apiProvider.toUpperCase()}`
                                    : "⚡ Local Mode — Phi-3 Mini (Built-in)"}
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                                {llmConfig.mode === "api" && llmConfig.apiKey
                                    ? `Using ${llmConfig.apiModel} via external API`
                                    : "Running offline with built-in conversational engine. Add an API key below to upgrade."}
                            </div>
                        </div>
                    </div>

                    {/* Architecture Diagram */}
                    <div style={{
                        padding: "16px",
                        borderRadius: "10px",
                        background: "rgba(0,0,0,0.2)",
                        marginBottom: "20px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        lineHeight: "1.6",
                        color: "var(--text-secondary)",
                        whiteSpace: "pre",
                        overflow: "auto",
                    }}>
                        {`┌─────────────────────────────────────────┐
│           LLM Router Architecture       │
├─────────────────────────────────────────┤
│                                         │
│   if (user_llm_key exists):             │
│       → use external API model          │
│         (OpenAI / Anthropic / Custom)   │
│   else:                                 │
│       → use local Phi-3 engine          │
│         (built-in, runs offline)        │
│                                         │
│   on API error:                         │
│       → fallback to local engine        │
│                                         │
└─────────────────────────────────────────┘`}
                    </div>

                    {/* Provider Selection */}
                    <div className="setting-row">
                        <div className="setting-label">
                            <span>API Provider</span>
                            <small>Choose your LLM provider</small>
                        </div>
                        <select
                            className="setting-select"
                            value={localConfig.apiProvider}
                            onChange={(e) => {
                                const prov = providers.find((p) => p.value === e.target.value);
                                setLocalConfig({
                                    ...localConfig,
                                    apiProvider: e.target.value,
                                    apiModel: prov?.models[0] || "",
                                });
                            }}
                        >
                            {providers.map((p) => (
                                <option key={p.value} value={p.value}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* API Key */}
                    <div className="setting-row">
                        <div className="setting-label">
                            <span>API Key</span>
                            <small>Your {selectedProvider.label} API key</small>
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <input
                                className="setting-input"
                                type={showKey ? "text" : "password"}
                                placeholder={`Enter your ${selectedProvider.label} API key...`}
                                value={localConfig.apiKey}
                                onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
                            />
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setShowKey(!showKey)}
                                title={showKey ? "Hide key" : "Show key"}
                            >
                                {showKey ? "🙈" : "👁️"}
                            </button>
                        </div>
                    </div>

                    {/* Model Selection */}
                    <div className="setting-row">
                        <div className="setting-label">
                            <span>Model</span>
                            <small>Select the model to use</small>
                        </div>
                        <select
                            className="setting-select"
                            value={localConfig.apiModel}
                            onChange={(e) => setLocalConfig({ ...localConfig, apiModel: e.target.value })}
                        >
                            {selectedProvider.models.map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Custom Endpoint */}
                    {localConfig.apiProvider === "custom" && (
                        <div className="setting-row">
                            <div className="setting-label">
                                <span>Custom Endpoint</span>
                                <small>OpenAI-compatible API endpoint URL</small>
                            </div>
                            <input
                                className="setting-input"
                                placeholder="https://api.example.com/v1/chat/completions"
                                value={localConfig.customEndpoint || ""}
                                onChange={(e) => setLocalConfig({ ...localConfig, customEndpoint: e.target.value })}
                            />
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "flex-end" }}>
                        {llmConfig.apiKey && (
                            <button className="btn btn-danger btn-sm" onClick={handleClearKey}>
                                Clear API Key
                            </button>
                        )}
                        <button className="btn btn-primary" onClick={handleSave}>
                            Save Settings
                        </button>
                    </div>
                </div>

                {/* OpenClaw Configuration */}
                <div className="settings-section">
                    <h3>🦞 OpenClaw Configuration</h3>
                    <div className="setting-row">
                        <div className="setting-label">
                            <span>Gateway URL</span>
                            <small>OpenClaw gateway WebSocket URL</small>
                        </div>
                        <input
                            className="setting-input"
                            value="ws://127.0.0.1:18789"
                            readOnly
                            style={{ opacity: 0.7 }}
                        />
                    </div>
                    <div className="setting-row">
                        <div className="setting-label">
                            <span>Workspace Directory</span>
                            <small>OpenClaw workspace root</small>
                        </div>
                        <input
                            className="setting-input"
                            value="~/.openclaw/workspace"
                            readOnly
                            style={{ opacity: 0.7 }}
                        />
                    </div>
                    <div className="setting-row">
                        <div className="setting-label">
                            <span>Browser Control</span>
                            <small>Enable browser automation for agents</small>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" defaultChecked />
                            <span className="toggle-slider" />
                        </label>
                    </div>
                </div>

                {/* Application Settings */}
                <div className="settings-section">
                    <h3>🎨 Application</h3>
                    <div className="setting-row">
                        <div className="setting-label">
                            <span>Notifications</span>
                            <small>Show desktop notifications for agent events</small>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" defaultChecked />
                            <span className="toggle-slider" />
                        </label>
                    </div>
                    <div className="setting-row">
                        <div className="setting-label">
                            <span>Auto-start Agents</span>
                            <small>Resume agent schedules on app launch</small>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" />
                            <span className="toggle-slider" />
                        </label>
                    </div>
                    <div className="setting-row">
                        <div className="setting-label">
                            <span>Log Retention</span>
                            <small>Number of log entries to keep</small>
                        </div>
                        <select className="setting-select" defaultValue="500">
                            <option value="100">100 entries</option>
                            <option value="500">500 entries</option>
                            <option value="1000">1000 entries</option>
                            <option value="5000">5000 entries</option>
                        </select>
                    </div>
                </div>
            </div>
        </>
    );
}

export default SettingsView;
