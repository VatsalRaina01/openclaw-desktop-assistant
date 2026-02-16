import React from "react";
import { useAppContext } from "../context/AppContext";

const NAV_ITEMS = [
    { id: "chat", icon: "💬", label: "Chat", section: "main" },
    { id: "agents", icon: "🤖", label: "Agents", section: "main" },
    { id: "scheduler", icon: "📅", label: "Scheduler", section: "main" },
    { id: "sandbox", icon: "🧪", label: "Sandbox", section: "main" },
    { id: "logs", icon: "📋", label: "Logs", section: "tools" },
    { id: "settings", icon: "⚙️", label: "Settings", section: "tools" },
];

function Sidebar() {
    const { activeView, dispatch, llmConfig, sandboxMode, agents, logs } = useAppContext();

    const mainItems = NAV_ITEMS.filter((n) => n.section === "main");
    const toolItems = NAV_ITEMS.filter((n) => n.section === "tools");

    const runningAgents = agents.filter((a) => a.status === "running").length;
    const errorLogs = logs.filter((l) => l.level === "error").length;

    return (
        <aside className="sidebar">
            {/* Header */}
            <div className="sidebar-header">
                <div className="sidebar-logo">🦞</div>
                <div className="sidebar-title">
                    <h1>OpenClaw</h1>
                    <span>Desktop Assistant</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                <div className="nav-section-title">Main</div>
                {mainItems.map((item) => (
                    <div
                        key={item.id}
                        className={`nav-item ${activeView === item.id ? "active" : ""}`}
                        onClick={() => dispatch({ type: "SET_VIEW", payload: item.id })}
                        role="button"
                        tabIndex={0}
                    >
                        <span className="nav-item-icon">{item.icon}</span>
                        <span>{item.label}</span>
                        {item.id === "agents" && runningAgents > 0 && (
                            <span className="nav-item-badge">{runningAgents}</span>
                        )}
                        {item.id === "sandbox" && sandboxMode && (
                            <span className="nav-item-badge" style={{ background: "#f59e0b" }}>ON</span>
                        )}
                    </div>
                ))}

                <div className="nav-section-title">Tools</div>
                {toolItems.map((item) => (
                    <div
                        key={item.id}
                        className={`nav-item ${activeView === item.id ? "active" : ""}`}
                        onClick={() => dispatch({ type: "SET_VIEW", payload: item.id })}
                        role="button"
                        tabIndex={0}
                    >
                        <span className="nav-item-icon">{item.icon}</span>
                        <span>{item.label}</span>
                        {item.id === "logs" && errorLogs > 0 && (
                            <span className="nav-item-badge" style={{ background: "#ef4444" }}>
                                {errorLogs}
                            </span>
                        )}
                    </div>
                ))}
            </nav>

            {/* Footer — LLM Status */}
            <div className="sidebar-footer">
                <div className="llm-status">
                    <div
                        className={`llm-status-dot ${llmConfig.mode === "api" && llmConfig.apiKey ? "api" : "local"
                            }`}
                    />
                    <span className="llm-status-text">
                        {llmConfig.mode === "api" && llmConfig.apiKey ? "API Mode" : "Local Mode"}
                    </span>
                    <span className="llm-status-model">
                        {llmConfig.mode === "api" && llmConfig.apiKey
                            ? llmConfig.apiModel
                            : "Phi-3"}
                    </span>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
