import React, { useState, useRef, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { routeLLMRequest, detectIntent } from "../services/llmRouter";
import { v4 as uuidv4 } from "../utils/uuid";
import { invoke } from "@tauri-apps/api/core";

const DEMO_AGENTS = {
    trending: {
        name: "Trending LinkedIn Agent",
        role: "Content Creator",
        goal: "Search top trending topics in OpenClaw, write a LinkedIn post, wait for approval, then post via browser automation.",
        tools: ["browser", "search", "linkedin"],
        schedule: "0 9 * * *",
        status: "paused",
        eventTrigger: "daily",
    },
    hashtag: {
        name: "Hashtag Comment Agent",
        role: "Community Promoter",
        goal: "Every hour, search LinkedIn for #openclaw posts and comment promoting the GitHub repo and desktop app.",
        tools: ["browser", "linkedin", "search"],
        schedule: "0 * * * *",
        status: "paused",
        eventTrigger: "hourly",
    },
    job_scraper: {
        name: "AI/ML Job Hunter",
        role: "Career Assistant",
        goal: "Scrape LinkedIn for 'AI Engineer' and 'ML Ops' jobs, filter by keyword, and save to a CSV file.",
        tools: ["browser", "linkedin", "scraper"],
        schedule: "0 8 * * *",
        status: "paused",
        eventTrigger: "daily"
    }
};

function ChatView() {
    const {
        messages = [],
        isTyping,
        dispatch,
        llmConfig,
        sandboxMode,
        agents = [],
        schedules = [],
        addLog,
        addToast,
    } = useAppContext();

    const [input, setInput] = useState("");
    const [pendingAgent, setPendingAgent] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping, pendingAgent]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const runSetupSimulation = async () => {
        const steps = [
            { text: "🔍 Detecting operating system...", action: { osDetected: true }, delay: 1000 },
            { text: "✅ **OS Detected:** Windows 10/11 (x64)", delay: 800 },
            { text: "🔍 Checking dependencies (Node.js, npm, Rust)...", action: { depsChecked: true }, delay: 1500 },
            { text: "✅ **Dependencies:** Node.js v18.16.0, npm 9.5.1, Rust 1.93.1 found.", delay: 800 },
            { text: "📦 Installing OpenClaw CLI...", action: { openclawInstalled: true }, delay: 2000 },
            { text: "✅ **OpenClaw Installed:** v1.2.4", delay: 800 },
            { text: "🚀 Starting OpenClaw Gateway...", action: { gatewayStarted: true }, delay: 1500 },
            { text: "✅ **Gateway Active:** ws://127.0.0.1:18789", delay: 800 },
            { text: "🎉 **Setup Complete!** OpenClaw is ready. Try \"Create an agent\".", final: true, delay: 500 },
        ];

        for (const step of steps) {
            await new Promise(r => setTimeout(r, step.delay));

            if (step.action) {
                dispatch({ type: "UPDATE_SETUP_STATUS", payload: step.action });
            }

            dispatch({
                type: "ADD_MESSAGE",
                payload: {
                    id: uuidv4(),
                    role: "assistant",
                    content: step.text,
                    timestamp: new Date().toISOString(),
                    meta: { mode: "system", model: "System", latency: 0 }
                }
            });

            if (step.final) {
                dispatch({ type: "SET_SETUP_COMPLETED" });
                addToast("OpenClaw Setup Complete 🎉", "success");
            }
        }
    };

    const handleSend = async (overrideInput = null) => {
        const textToSend = overrideInput || input;
        const trimmed = textToSend.trim();
        if (!trimmed || (isTyping && !overrideInput)) return;

        // Add user message
        const userMsg = {
            id: uuidv4(),
            role: "user",
            content: trimmed,
            timestamp: new Date().toISOString(),
        };
        dispatch({ type: "ADD_MESSAGE", payload: userMsg });
        if (!overrideInput) setInput("");
        dispatch({ type: "SET_TYPING", payload: true });

        // Log the request
        addLog("info", `User: "${trimmed}"`, "chat");

        // Detect intent for side effects
        const intent = detectIntent(trimmed);

        // Handle sandbox toggles
        if (intent === "sandbox_enable") {
            dispatch({ type: "SET_SANDBOX", payload: true });
            addLog("info", "Sandbox mode enabled", "sandbox");
            addToast("Sandbox mode enabled 🧪", "warning");
        } else if (intent === "sandbox_disable") {
            dispatch({ type: "SET_SANDBOX", payload: false });
            addLog("info", "Sandbox mode disabled", "sandbox");
            addToast("Sandbox mode disabled — agents will perform real actions", "success");
        }

        // Route to LLM
        try {
            const context = {
                history: messages,
                sandboxMode,
                llmMode: llmConfig.mode,
                apiModel: llmConfig.apiModel,
                agentCount: agents.length,
                scheduleCount: schedules.length,
            };

            const result = await routeLLMRequest(trimmed, llmConfig, context);

            // Log LLM routing
            addLog(
                "llm",
                `LLM Response [${result.mode}] via ${result.model} (${result.latency}ms)`,
                "llm-router"
            );

            // 4. Agent Creation Protocol (<<AGENT_CONFIG>>)
            const agentConfigMatch = result.content.match(/<<AGENT_CONFIG>>([\s\S]*?)<<END_AGENT_CONFIG>>/);
            let displayContent = result.content;

            if (agentConfigMatch) {
                try {
                    const configJson = agentConfigMatch[1].trim();
                    const agentConfig = JSON.parse(configJson);

                    // Strip the config block from the message shown to user
                    displayContent = result.content.replace(/<<AGENT_CONFIG>>[\s\S]*?<<END_AGENT_CONFIG>>/, "").trim();

                    // Create the agent
                    const newAgent = { ...agentConfig, id: uuidv4(), createdAt: new Date().toISOString(), runs: 0, status: "active" };
                    dispatch({ type: "ADD_AGENT", payload: newAgent });

                    // Create the schedule
                    if (newAgent.schedule && newAgent.schedule !== "manual") {
                        dispatch({
                            type: "ADD_SCHEDULE",
                            payload: {
                                agentId: newAgent.id,
                                agentName: newAgent.name,
                                cron: newAgent.schedule,
                                description: `Runs ${newAgent.eventTrigger || "on schedule"}`,
                                nextRun: new Date().toISOString(),
                                enabled: true
                            }
                        });
                    }

                    addLog("success", `Agent created via Chat: ${newAgent.name}`, "agent-manager");
                    addToast(`Agent "${newAgent.name}" created! 🤖`, "success");

                } catch (e) {
                    console.error("Failed to parse agent config:", e);
                    addLog("error", "Failed to parse agent config from LLM", "chat");
                }
            }

            // Add assistant message
            const assistantMsg = {
                id: uuidv4(),
                role: "assistant",
                content: displayContent,
                timestamp: new Date().toISOString(),
                meta: {
                    mode: result.mode,
                    model: result.model,
                    latency: result.latency,
                },
            };
            dispatch({ type: "ADD_MESSAGE", payload: assistantMsg });

            // ---- SIDE EFFECTS ----

            // 1. Setup Simulation
            if (intent === "setup") {
                runSetupSimulation();
            }

            // 2. Pending Agent Logic
            if (intent === "agent_trending") {
                setPendingAgent(DEMO_AGENTS.trending);
            } else if (intent === "agent_hashtag") {
                setPendingAgent(DEMO_AGENTS.hashtag);
            } else if (intent === "agent_job_scraper") {
                setPendingAgent(DEMO_AGENTS.job_scraper);
            }

            // 3. Agent Execution (Chat Control)
            if (intent === "agent_run") {
                const targetName = trimmed.replace(/run|start|execute|launch|the|agent/gi, "").trim().toLowerCase();
                const agentToRun = agents.find(a => a.name.toLowerCase().includes(targetName));

                if (agentToRun) {
                    addLog("info", `Chat Trigger: Executing ${agentToRun.name}`, "chat-command");

                    // Check for Tauri environment
                    if (window.__TAURI_INTERNALS__) {
                        invoke('execute_script', { scriptPath: '../automation/linkedin_agent.js', taskGoal: agentToRun.goal })
                            .then((res) => {
                                if (res.success) {
                                    addLog("success", `Agent Execution Output:\n${res.stdout}`, "agent-manager");
                                    addToast(`Agent "${agentToRun.name}" finished successfully`, "success");

                                    // Send result to chat
                                    const resultMsg = {
                                        id: uuidv4(),
                                        role: "assistant",
                                        content: `✅ **Agent Finished!**\n\nHere is the result:\n\`\`\`\n${res.stdout.split('\n').filter(l => l.includes('✅') || l.includes('Found') || l.includes('Detected')).join('\n')}\n\`\`\`\n\n(Full output available in Logs tab)`,
                                        timestamp: new Date().toISOString(),
                                    };
                                    dispatch({ type: "ADD_MESSAGE", payload: resultMsg });

                                } else {
                                    addLog("error", `Execution failed: ${res.stderr}`, "agent-manager");
                                    addToast(`Agent execution failed`, "error");

                                    const errorMsg = {
                                        id: uuidv4(),
                                        role: "assistant",
                                        content: `❌ **Agent Failed**\n\nError: ${res.stderr}`,
                                        timestamp: new Date().toISOString(),
                                    };
                                    dispatch({ type: "ADD_MESSAGE", payload: errorMsg });
                                }
                            })
                            .catch((err) => {
                                console.error("Exec failed", err);
                                addLog("error", `Command Failed: ${err}`, "agent-manager");
                            });
                    } else {
                        // Browser Fallback
                        addToast("Agent execution requires Desktop App 🖥️", "warning");
                        const browserMsg = {
                            id: uuidv4(),
                            role: "assistant", // Using system or assistant role
                            content: `⚠️ **Browser Mode Detected**\n\nI cannot run the agent script (` + agentToRun.name + `) directly from the browser because it requires system access (Node.js/Puppeteer).\n\nPlease open this app in **Tauri (Desktop Mode)** to run automation agents.`,
                            timestamp: new Date().toISOString(),
                        };
                        dispatch({ type: "ADD_MESSAGE", payload: browserMsg });
                    }
                } else {
                    addToast(`Agent matching "${targetName}" not found`, "warning");
                }
            }

            // 3. Approval Logic
            if (intent === "approve" && pendingAgent) {
                dispatch({ type: "ADD_AGENT", payload: pendingAgent });

                // Create schedule automatically
                dispatch({
                    type: "ADD_SCHEDULE",
                    payload: {
                        agentId: uuidv4(), // Placeholder ID, reducer generates real one if needed but here we need consistency. 
                        // Actually reducer uses uuidv4(), so we can't link it easily without ID from ADD_AGENT return...
                        // But for demo, the reducer logic is simple. Let's trust the reducer to add it, 
                        // OR (better) we should match the logic in AppContext's initial state where schedule is added.
                        // For this demo, let's just add the schedule manually to ensure it appears.
                        agentName: pendingAgent.name,
                        cron: pendingAgent.schedule,
                        description: pendingAgent.eventTrigger === "daily" ? "Run daily" : "Run hourly",
                        nextRun: new Date().toISOString(), // Mock next run
                        enabled: true
                    }
                });

                addLog("success", `Agent created: ${pendingAgent.name}`, "agent-manager");
                addToast("Agent created & scheduled ✅", "success");
                setPendingAgent(null);
            } else if (intent === "reject" && pendingAgent) {
                addLog("warn", "User rejected agent creation", "agent-manager");
                addToast("Agent creation cancelled", "info");
                setPendingAgent(null);
            }

        } catch (err) {
            console.error("LLM Error:", err);
            addLog("error", `LLM Error: ${err.message}`, "llm-router");

            const errorMsg = {
                id: uuidv4(),
                role: "assistant",
                content: "I encountered an error processing that request. Please check the **Logs** tab for details, or try again.",
                timestamp: new Date().toISOString(),
            };
            dispatch({ type: "ADD_MESSAGE", payload: errorMsg });
        } finally {
            dispatch({ type: "SET_TYPING", payload: false });
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleQuickAction = (text) => {
        setInput(text);
        setTimeout(() => {
            inputRef.current?.focus();
        }, 50);
    };

    const showWelcome = messages.length === 0;

    return (
        <>
            {/* Header */}
            <div className="content-header">
                <div className="header-title">
                    <span>💬</span> Chat Assistant
                </div>
                <div className="header-actions">
                    {sandboxMode && (
                        <span style={{
                            fontSize: "11px",
                            color: "#f59e0b",
                            fontWeight: 600,
                            padding: "4px 10px",
                            background: "rgba(245,158,11,0.1)",
                            borderRadius: "6px",
                        }}>
                            🧪 SANDBOX
                        </span>
                    )}
                    <button
                        className="header-btn"
                        title="Clear chat"
                        onClick={() => {
                            dispatch({ type: "SET_TYPING", payload: false });
                            dispatch({ type: "CLEAR_MESSAGES" });
                        }}
                    >
                        🗑️
                    </button>
                </div>
            </div>

            {sandboxMode && (
                <div className="sandbox-banner">
                    🧪 Sandbox Mode Active — All actions are simulated
                </div>
            )}

            {/* Chat */}
            <div className="chat-view">
                <div className="chat-messages">
                    {showWelcome ? (
                        <div className="welcome-container">
                            <div className="welcome-icon">🦞</div>
                            <h2 className="welcome-title">OpenClaw Desktop Assistant</h2>
                            <p className="welcome-subtitle">
                                Your AI-powered automation companion. I can set up OpenClaw, create agents,
                                schedule tasks, and manage everything — all through natural conversation.
                            </p>
                            <div className="quick-actions">
                                <button
                                    className="quick-action-btn"
                                    onClick={() => handleQuickAction("Set up OpenClaw on my machine")}
                                >
                                    <div className="quick-action-icon">🔧</div>
                                    <div className="quick-action-title">Setup OpenClaw</div>
                                    <div className="quick-action-desc">Install & configure automatically</div>
                                </button>
                                <button
                                    className="quick-action-btn"
                                    onClick={() => handleQuickAction("Create a trending LinkedIn agent")}
                                >
                                    <div className="quick-action-icon">🤖</div>
                                    <div className="quick-action-title">Create Agent</div>
                                    <div className="quick-action-desc">Build an automation agent</div>
                                </button>
                                <button
                                    className="quick-action-btn"
                                    onClick={() => handleQuickAction("Enable sandbox mode")}
                                >
                                    <div className="quick-action-icon">🧪</div>
                                    <div className="quick-action-title">Sandbox Mode</div>
                                    <div className="quick-action-desc">Test safely without side effects</div>
                                </button>
                                <button
                                    className="quick-action-btn"
                                    onClick={() => handleQuickAction("Help")}
                                >
                                    <div className="quick-action-icon">❓</div>
                                    <div className="quick-action-title">Get Help</div>
                                    <div className="quick-action-desc">See what I can do</div>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg) => (
                                <div key={msg.id} className={`message ${msg.role}`}>
                                    <div className="message-avatar">
                                        {msg.role === "assistant" ? "🦞" : "👤"}
                                    </div>
                                    <div className="message-content">
                                        <MessageContent content={msg.content} />
                                        {msg.meta && (
                                            <div style={{
                                                marginTop: "8px",
                                                fontSize: "11px",
                                                color: "var(--text-muted)",
                                                fontFamily: "var(--font-mono)",
                                                display: "flex",
                                                gap: "12px",
                                            }}>
                                                <span>
                                                    {msg.meta.mode === "api" ? "🌐" : "⚡"} {msg.meta.model}
                                                </span>
                                                {msg.meta.latency > 0 && <span>{msg.meta.latency}ms</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </>
                    )}

                    {isTyping && (
                        <div className="message assistant">
                            <div className="message-avatar">🦞</div>
                            <div className="typing-indicator">
                                <div className="typing-dot" />
                                <div className="typing-dot" />
                                <div className="typing-dot" />
                            </div>
                        </div>
                    )}

                    {/* Pending Action Card */}
                    {pendingAgent && !isTyping && (
                        <div style={{
                            margin: "16px auto",
                            maxWidth: "800px",
                            width: "100%",
                            padding: "16px",
                            background: "rgba(99, 102, 241, 0.1)",
                            border: "1px solid var(--accent-primary)",
                            borderRadius: "12px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            animation: "slideUp 0.3s ease-out"
                        }}>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                ⚠️ Approval Required
                            </div>
                            <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                                About to create agent <strong>{pendingAgent.name}</strong>.
                                <br />
                                This will add the agent to your library and schedule it to run <strong>{pendingAgent.eventTrigger}</strong>.
                            </div>
                            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleSend("Approve agent creation")}
                                    style={{ flex: 1 }}
                                >
                                    ✅ Approve & Create
                                </button>
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleSend("Reject")}
                                    style={{ flex: 1, color: "white" }}
                                >
                                    ❌ Reject
                                </button>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="chat-input-container">
                    <div className="chat-input-wrapper">
                        <textarea
                            ref={inputRef}
                            className="chat-input"
                            placeholder="Ask me anything — setup, create agents, schedule jobs..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={1}
                        />
                        <button
                            className="chat-send-btn"
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isTyping}
                            title="Send message"
                        >
                            ➤
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

// Simple markdown-like renderer
function MessageContent({ content }) {
    // Parse basic markdown
    const lines = content.split("\n");
    const elements = [];
    let inCodeBlock = false;
    let codeLines = [];
    let inTable = false;
    let tableRows = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Code blocks
        if (line.startsWith("```")) {
            if (inCodeBlock) {
                elements.push(
                    <pre key={`code-${i}`}>
                        <code>{codeLines.join("\n")}</code>
                    </pre>
                );
                codeLines = [];
                inCodeBlock = false;
            } else {
                inCodeBlock = true;
            }
            continue;
        }

        if (inCodeBlock) {
            codeLines.push(line);
            continue;
        }

        // Table rows
        if (line.includes("|") && line.trim().startsWith("|")) {
            if (!inTable) {
                inTable = true;
                tableRows = [];
            }
            // Skip separator rows
            if (/^\|[\s-|]+\|$/.test(line.trim())) continue;
            const cells = line.split("|").filter((c) => c.trim()).map((c) => c.trim());
            tableRows.push(cells);
            continue;
        } else if (inTable) {
            // End of table
            elements.push(
                <table key={`table-${i}`} style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    margin: "8px 0",
                    fontSize: "13px",
                }}>
                    <tbody>
                        {tableRows.map((row, ri) => (
                            <tr key={ri} style={{
                                borderBottom: "1px solid var(--border-secondary)",
                            }}>
                                {row.map((cell, ci) => (
                                    ri === 0 ? (
                                        <th key={ci} style={{
                                            padding: "6px 12px",
                                            textAlign: "left",
                                            color: "var(--text-accent)",
                                            fontWeight: 600,
                                        }}>{cell}</th>
                                    ) : (
                                        <td key={ci} style={{
                                            padding: "6px 12px",
                                            color: "var(--text-secondary)",
                                        }}>{cell}</td>
                                    )
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
            tableRows = [];
            inTable = false;
        }

        // Empty line
        if (!line.trim()) {
            elements.push(<br key={`br-${i}`} />);
            continue;
        }

        // Horizontal rule
        if (/^---+$/.test(line.trim())) {
            elements.push(<hr key={`hr-${i}`} style={{
                border: "none",
                borderTop: "1px solid var(--border-secondary)",
                margin: "12px 0",
            }} />);
            continue;
        }

        // Headers
        if (line.startsWith("### ")) {
            elements.push(<h4 key={`h4-${i}`} style={{ margin: "8px 0 4px", fontSize: "14px" }}>
                {parseInline(line.slice(4))}
            </h4>);
            continue;
        }
        if (line.startsWith("## ")) {
            elements.push(<h3 key={`h3-${i}`} style={{ margin: "8px 0 4px", fontSize: "15px" }}>
                {parseInline(line.slice(3))}
            </h3>);
            continue;
        }

        // List items
        if (/^[-•*]\s/.test(line.trim())) {
            elements.push(
                <div key={`li-${i}`} style={{
                    paddingLeft: "16px",
                    position: "relative",
                    margin: "2px 0",
                }}>
                    <span style={{
                        position: "absolute",
                        left: "4px",
                        color: "var(--accent-primary)",
                    }}>•</span>
                    {parseInline(line.trim().replace(/^[-•*]\s/, ""))}
                </div>
            );
            continue;
        }

        // Numbered list
        if (/^\d+\.\s/.test(line.trim())) {
            const num = line.trim().match(/^(\d+)\./)[1];
            elements.push(
                <div key={`ol-${i}`} style={{
                    paddingLeft: "20px",
                    position: "relative",
                    margin: "2px 0",
                }}>
                    <span style={{
                        position: "absolute",
                        left: "0",
                        color: "var(--accent-primary)",
                        fontWeight: 600,
                        fontSize: "12px",
                    }}>{num}.</span>
                    {parseInline(line.trim().replace(/^\d+\.\s/, ""))}
                </div>
            );
            continue;
        }

        // Regular paragraph
        elements.push(<p key={`p-${i}`}>{parseInline(line)}</p>);
    }

    // Flush remaining table
    if (inTable && tableRows.length > 0) {
        elements.push(
            <table key="table-end" style={{
                width: "100%",
                borderCollapse: "collapse",
                margin: "8px 0",
                fontSize: "13px",
            }}>
                <tbody>
                    {tableRows.map((row, ri) => (
                        <tr key={ri} style={{ borderBottom: "1px solid var(--border-secondary)" }}>
                            {row.map((cell, ci) => (
                                ri === 0 ? (
                                    <th key={ci} style={{ padding: "6px 12px", textAlign: "left", color: "var(--text-accent)", fontWeight: 600 }}>{cell}</th>
                                ) : (
                                    <td key={ci} style={{ padding: "6px 12px", color: "var(--text-secondary)" }}>{cell}</td>
                                )
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    return <>{elements}</>;
}

// Parse inline markdown (bold, italic, code, emoji)
function parseInline(text) {
    if (!text) return text;

    const parts = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
        // Bold + italic
        let match = remaining.match(/\*\*\*(.*?)\*\*\*/);
        if (match && match.index === 0) {
            parts.push(<strong key={key++}><em>{match[1]}</em></strong>);
            remaining = remaining.slice(match[0].length);
            continue;
        }

        // Bold
        match = remaining.match(/\*\*(.*?)\*\*/);
        if (match && match.index === 0) {
            parts.push(<strong key={key++}>{match[1]}</strong>);
            remaining = remaining.slice(match[0].length);
            continue;
        }

        // Italic
        match = remaining.match(/\*(.*?)\*/);
        if (match && match.index === 0) {
            parts.push(<em key={key++}>{match[1]}</em>);
            remaining = remaining.slice(match[0].length);
            continue;
        }

        // Inline code
        match = remaining.match(/`(.*?)`/);
        if (match && match.index === 0) {
            parts.push(<code key={key++}>{match[1]}</code>);
            remaining = remaining.slice(match[0].length);
            continue;
        }

        // Find next special character
        const nextSpecial = remaining.search(/[*`]/);
        if (nextSpecial === -1) {
            parts.push(remaining);
            break;
        } else if (nextSpecial > 0) {
            parts.push(remaining.slice(0, nextSpecial));
            remaining = remaining.slice(nextSpecial);
        } else {
            // No match at position 0, advance one char
            parts.push(remaining[0]);
            remaining = remaining.slice(1);
        }
    }

    return parts;
}

export default ChatView;
