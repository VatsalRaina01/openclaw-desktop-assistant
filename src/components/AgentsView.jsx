import React, { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { v4 as uuidv4 } from "../utils/uuid";

function AgentsView() {
    const { agents, dispatch, addLog, addToast, sandboxMode } = useAppContext();
    const [showCreateModal, setShowCreateModal] = useState(false);

    const handleToggleAgent = (agent) => {
        const newStatus = agent.status === "running" ? "paused" : "running";
        dispatch({
            type: "UPDATE_AGENT",
            payload: { id: agent.id, status: newStatus },
        });
        addLog(
            newStatus === "running" ? "success" : "warn",
            `Agent "${agent.name}" ${newStatus === "running" ? "started" : "paused"}${sandboxMode ? " (sandbox)" : ""}`,
            "agent-manager"
        );
        addToast(
            `${agent.name} ${newStatus === "running" ? "started ▶️" : "paused ⏸️"}`,
            newStatus === "running" ? "success" : "warning"
        );
    };

    const handleDeleteAgent = (agent) => {
        dispatch({ type: "DELETE_AGENT", payload: agent.id });
        addLog("warn", `Agent "${agent.name}" deleted`, "agent-manager");
        addToast(`${agent.name} deleted`, "error");
    };

    const handleRunOnce = (agent) => {
        dispatch({
            type: "UPDATE_AGENT",
            payload: { id: agent.id, runs: agent.runs + 1, lastRun: new Date().toISOString() },
        });
        addLog(
            "success",
            `Agent "${agent.name}" executed${sandboxMode ? " (sandbox - simulated)" : ""}`,
            "agent-manager"
        );
        addToast(
            `${agent.name} executed${sandboxMode ? " (simulated)" : ""} ✅`,
            "success"
        );
    };

    return (
        <>
            <div className="content-header">
                <div className="header-title">
                    <span>🤖</span> Agents
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
                        + New Agent
                    </button>
                </div>
            </div>

            {sandboxMode && (
                <div className="sandbox-banner">
                    🧪 Sandbox Mode Active — Agent actions are simulated
                </div>
            )}

            <div className="page-view">
                <h2 className="page-title">Your Agents</h2>
                <p className="page-subtitle">
                    Manage your automation agents. Create, start, pause, or configure agents to automate your workflows.
                </p>

                {agents.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🤖</div>
                        <h3>No agents yet</h3>
                        <p>Create your first agent to start automating tasks. You can also use the Chat to create agents conversationally.</p>
                        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                            Create Agent
                        </button>
                    </div>
                ) : (
                    <div className="agents-grid">
                        {agents.map((agent) => (
                            <div key={agent.id} className="agent-card">
                                <div className="agent-card-header">
                                    <div className="agent-card-icon">
                                        {agent.name.includes("Trending") ? "📈" : agent.name.includes("Hashtag") ? "#️⃣" : "🤖"}
                                    </div>
                                    <div className={`agent-card-status ${agent.status}`}>
                                        <div
                                            className="agent-card-status-dot"
                                            style={{
                                                animation: agent.status === "running" ? "pulse 2s infinite" : "none",
                                                boxShadow: agent.status === "running" ? "0 0 8px currentColor" : "none"
                                            }}
                                        />
                                        {agent.status === "running" ? "Active" : "Paused"}
                                    </div>
                                </div>
                                <h3>{agent.name}</h3>
                                <p>{agent.goal}</p>
                                <div className="agent-card-meta">
                                    <span className="agent-meta-tag">📋 {agent.role}</span>
                                    <span className="agent-meta-tag">⏰ {agent.schedule}</span>
                                    <span className="agent-meta-tag" title="Event Trigger">
                                        {agent.eventTrigger === "heartbeat" ? "💓" : "⚡"} {agent.eventTrigger}
                                    </span>
                                    <span className="agent-meta-tag">🔄 {agent.runs} runs</span>
                                    {agent.lastRun && (
                                        <span className="agent-meta-tag" style={{ color: "var(--text-accent)" }}>
                                            🕒 Last: {new Date(agent.lastRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                    {agent.tools.map((tool) => (
                                        <span key={tool} className="agent-meta-tag">🔧 {tool}</span>
                                    ))}
                                </div>
                                <div className="agent-card-actions">
                                    <button
                                        className={`btn btn-sm ${agent.status === "running" ? "btn-secondary" : "btn-success"}`}
                                        onClick={() => handleToggleAgent(agent)}
                                    >
                                        {agent.status === "running" ? "⏸️ Pause" : "▶️ Start"}
                                    </button>
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => handleRunOnce(agent)}
                                    >
                                        ⚡ Run Once
                                    </button>
                                    <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => handleDeleteAgent(agent)}
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Agent Modal */}
            {showCreateModal && (
                <CreateAgentModal onClose={() => setShowCreateModal(false)} />
            )}
        </>
    );
}

function CreateAgentModal({ onClose }) {
    const { dispatch, addLog, addToast } = useAppContext();
    const [form, setForm] = useState({
        name: "",
        role: "",
        goal: "",
        tools: "browser, search",
        schedule: "0 9 * * *",
        eventTrigger: "daily",
        status: "paused",
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.goal.trim()) {
            addToast("Please fill in agent name and goal", "warning");
            return;
        }

        dispatch({
            type: "ADD_AGENT",
            payload: {
                ...form,
                tools: form.tools.split(",").map((t) => t.trim()).filter(Boolean),
            },
        });

        // Also create a schedule
        dispatch({
            type: "ADD_SCHEDULE",
            payload: {
                agentId: "new", // Will be linked
                agentName: form.name,
                cron: form.schedule,
                description: `Schedule for ${form.name}`,
                nextRun: new Date(Date.now() + 3600000).toISOString(),
                enabled: true,
            },
        });

        addLog("success", `Agent "${form.name}" created`, "agent-manager");
        addToast(`Agent "${form.name}" created! 🎉`, "success");
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h2>Create New Agent</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Agent Name</label>
                            <input
                                className="form-input"
                                placeholder="e.g., Trending Topics Agent"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <input
                                className="form-input"
                                placeholder="e.g., Content Creator"
                                value={form.role}
                                onChange={(e) => setForm({ ...form, role: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Goal</label>
                            <textarea
                                className="form-input form-textarea"
                                placeholder="Describe what this agent should do..."
                                value={form.goal}
                                onChange={(e) => setForm({ ...form, goal: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tools (comma-separated)</label>
                            <input
                                className="form-input"
                                placeholder="browser, search, linkedin"
                                value={form.tools}
                                onChange={(e) => setForm({ ...form, tools: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Schedule (Cron Expression)</label>
                            <input
                                className="form-input"
                                placeholder="0 9 * * *"
                                value={form.schedule}
                                onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                                style={{ fontFamily: "var(--font-mono)" }}
                            />
                            <small style={{ color: "var(--text-tertiary)", fontSize: "11px", marginTop: "4px", display: "block" }}>
                                Examples: <code>0 9 * * *</code> (daily 9AM), <code>0 * * * *</code> (hourly), <code>*/30 * * * *</code> (every 30 min)
                            </small>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Event Trigger</label>
                            <select
                                className="form-input"
                                value={form.eventTrigger}
                                onChange={(e) => setForm({ ...form, eventTrigger: e.target.value })}
                                style={{ cursor: "pointer" }}
                            >
                                <option value="daily">Daily</option>
                                <option value="hourly">Hourly</option>
                                <option value="weekly">Weekly</option>
                                <option value="manual">Manual Only</option>
                                <option value="webhook">Webhook</option>
                                <option value="heartbeat">Heartbeat</option>
                            </select>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Create Agent
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AgentsView;
