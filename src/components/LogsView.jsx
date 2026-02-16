import React, { useState } from "react";
import { useAppContext } from "../context/AppContext";

const LEVEL_FILTERS = ["all", "info", "success", "warn", "error", "llm"];

function LogsView() {
    const { logs, dispatch, addToast } = useAppContext();
    const [activeFilter, setActiveFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredLogs = logs.filter((log) => {
        if (activeFilter !== "all" && log.level !== activeFilter) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
                log.message.toLowerCase().includes(q) ||
                log.source.toLowerCase().includes(q)
            );
        }
        return true;
    });

    const formatTime = (iso) => {
        const d = new Date(iso);
        return d.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    };

    const levelIcons = {
        info: "ℹ️",
        success: "✅",
        warn: "⚠️",
        error: "❌",
        llm: "🧠",
    };

    return (
        <>
            <div className="content-header">
                <div className="header-title">
                    <span>📋</span> Logs & Observability
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                            dispatch({ type: "CLEAR_LOGS" });
                            addToast("Logs cleared", "info");
                        }}
                    >
                        🗑️ Clear
                    </button>
                </div>
            </div>

            <div className="page-view">
                <h2 className="page-title">Execution Logs</h2>
                <p className="page-subtitle">
                    Monitor all system activity, agent executions, LLM routing decisions, and approval history.
                </p>

                {/* Filters */}
                <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap" }}>
                    <div className="log-filters">
                        {LEVEL_FILTERS.map((level) => (
                            <button
                                key={level}
                                className={`log-filter-btn ${activeFilter === level ? "active" : ""}`}
                                onClick={() => setActiveFilter(level)}
                            >
                                {level === "all" ? "📋 All" : `${levelIcons[level]} ${level.charAt(0).toUpperCase() + level.slice(1)}`}
                            </button>
                        ))}
                    </div>
                    <input
                        className="form-input"
                        placeholder="🔍 Search logs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ maxWidth: "250px", padding: "6px 12px", fontSize: "12px" }}
                    />
                </div>

                {/* Logs List */}
                {filteredLogs.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <h3>No logs found</h3>
                        <p>
                            {activeFilter !== "all"
                                ? `No ${activeFilter} level logs. Try changing the filter.`
                                : "Actions will appear here as you use the app."}
                        </p>
                    </div>
                ) : (
                    <div className="logs-container">
                        {filteredLogs.map((log) => (
                            <div key={log.id} className="log-entry">
                                <span className="log-timestamp">{formatTime(log.timestamp)}</span>
                                <span className={`log-level ${log.level}`}>
                                    {levelIcons[log.level]} {log.level}
                                </span>
                                <span className="log-message">{log.message}</span>
                                <span className="log-source">{log.source}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{
                    marginTop: "16px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    textAlign: "center",
                }}>
                    Showing {filteredLogs.length} of {logs.length} logs
                </div>
            </div>
        </>
    );
}

export default LogsView;
