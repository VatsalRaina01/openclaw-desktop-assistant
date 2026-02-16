import React from "react";
import { useAppContext } from "../context/AppContext";

function SchedulerView() {
    const { schedules, dispatch, addLog, addToast } = useAppContext();

    const handleToggle = (sched) => {
        dispatch({
            type: "UPDATE_SCHEDULE",
            payload: { id: sched.id, enabled: !sched.enabled },
        });
        addLog(
            sched.enabled ? "warn" : "success",
            `Schedule "${sched.agentName}" ${sched.enabled ? "disabled" : "enabled"}`,
            "scheduler"
        );
    };

    const handleDelete = (sched) => {
        dispatch({ type: "DELETE_SCHEDULE", payload: sched.id });
        addLog("warn", `Schedule for "${sched.agentName}" deleted`, "scheduler");
        addToast(`Schedule deleted`, "warning");
    };

    const formatNextRun = (iso) => {
        if (!iso) return "—";
        const d = new Date(iso);
        const now = new Date();
        const diff = d - now;
        if (diff < 0) return "Overdue";
        if (diff < 3600000) return `in ${Math.round(diff / 60000)} min`;
        if (diff < 86400000) return `in ${Math.round(diff / 3600000)} hours`;
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    const cronToHuman = (cron) => {
        if (cron === "0 9 * * *") return "Daily at 9:00 AM";
        if (cron === "0 * * * *") return "Every hour";
        if (cron === "*/30 * * * *") return "Every 30 minutes";
        if (cron === "*/15 * * * *") return "Every 15 minutes";
        if (cron === "0 0 * * 1") return "Weekly on Monday";
        return cron;
    };

    return (
        <>
            <div className="content-header">
                <div className="header-title">
                    <span>📅</span> Scheduler
                </div>
            </div>

            <div className="page-view">
                <h2 className="page-title">Scheduled Jobs</h2>
                <p className="page-subtitle">
                    View and manage scheduled jobs. Agents run automatically based on their cron schedules.
                </p>

                {schedules.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📅</div>
                        <h3>No scheduled jobs</h3>
                        <p>Create an agent with a schedule to see it here. Schedules run automatically in the background.</p>
                    </div>
                ) : (
                    <div className="schedule-list">
                        {schedules.map((sched) => (
                            <div key={sched.id} className="schedule-card" style={{
                                opacity: sched.enabled ? 1 : 0.5,
                            }}>
                                <div className="schedule-time-icon">
                                    {sched.enabled ? "⏰" : "⏸️"}
                                </div>
                                <div className="schedule-info">
                                    <h4>{sched.agentName}</h4>
                                    <p>{sched.description}</p>
                                </div>
                                <div className="schedule-cron">{sched.cron}</div>
                                <div className="schedule-next">
                                    <small>{cronToHuman(sched.cron)}</small>
                                    <strong>Next: {formatNextRun(sched.nextRun)}</strong>
                                </div>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <button
                                        className={`btn btn-sm ${sched.enabled ? "btn-secondary" : "btn-success"}`}
                                        onClick={() => handleToggle(sched)}
                                    >
                                        {sched.enabled ? "Disable" : "Enable"}
                                    </button>
                                    <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => handleDelete(sched)}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Cron Reference */}
                <div className="settings-section" style={{ marginTop: "32px" }}>
                    <h3>📖 Cron Expression Reference</h3>
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                        gap: "12px",
                        marginTop: "12px",
                    }}>
                        {[
                            { cron: "* * * * *", desc: "Every minute" },
                            { cron: "*/5 * * * *", desc: "Every 5 minutes" },
                            { cron: "*/15 * * * *", desc: "Every 15 minutes" },
                            { cron: "*/30 * * * *", desc: "Every 30 minutes" },
                            { cron: "0 * * * *", desc: "Every hour" },
                            { cron: "0 9 * * *", desc: "Daily at 9:00 AM" },
                            { cron: "0 9,18 * * *", desc: "9 AM and 6 PM daily" },
                            { cron: "0 0 * * 1", desc: "Every Monday at midnight" },
                        ].map((item) => (
                            <div key={item.cron} style={{
                                padding: "10px 14px",
                                background: "var(--bg-glass)",
                                borderRadius: "8px",
                                border: "1px solid var(--border-secondary)",
                            }}>
                                <code style={{
                                    fontFamily: "var(--font-mono)",
                                    fontSize: "12px",
                                    color: "var(--text-accent)",
                                }}>{item.cron}</code>
                                <div style={{
                                    fontSize: "12px",
                                    color: "var(--text-secondary)",
                                    marginTop: "4px",
                                }}>{item.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}

export default SchedulerView;
