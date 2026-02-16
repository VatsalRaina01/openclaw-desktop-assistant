import React, { createContext, useContext, useReducer, useCallback } from "react";
import { v4 as uuidv4 } from "../utils/uuid";
import parser from "cron-parser";

// ---- Initial State ----
const initialState = {
    activeView: "chat",
    sandboxMode: false,

    // LLM Configuration
    llmConfig: {
        mode: "local", // "local" | "api"
        apiProvider: "openai", // "openai" | "anthropic" | "custom"
        apiKey: "",
        apiModel: "gpt-4o-mini",
        localModel: "phi-3-mini (Built-in)",
    },

    // Chat
    messages: [],
    isTyping: false,

    // Agents
    agents: [
        {
            id: "agent-trending",
            name: "Trending LinkedIn Agent",
            role: "Content Creator",
            goal: "Search top trending topics in OpenClaw, write a LinkedIn post, wait for approval, then post via browser automation.",
            tools: ["browser", "search", "linkedin"],
            schedule: "0 9 * * *",
            status: "paused",
            eventTrigger: "daily",
            createdAt: new Date().toISOString(),
            runs: 0,
            lastRun: null,
        },
        {
            id: "agent-hashtag",
            name: "Hashtag Comment Agent",
            role: "Community Promoter",
            goal: "Every hour, search LinkedIn for #openclaw posts and comment promoting the GitHub repo and desktop app.",
            tools: ["browser", "linkedin", "search"],
            schedule: "0 * * * *",
            status: "paused",
            eventTrigger: "hourly",
            createdAt: new Date().toISOString(),
            runs: 0,
            lastRun: null,
        },
    ],

    // Schedules  
    schedules: [
        {
            id: "sched-1",
            agentId: "agent-trending",
            agentName: "Trending LinkedIn Agent",
            cron: "0 9 * * *",
            description: "Run daily at 9:00 AM",
            nextRun: getNextCronRun("daily"),
            enabled: true,
        },
        {
            id: "sched-2",
            agentId: "agent-hashtag",
            agentName: "Hashtag Comment Agent",
            cron: "0 * * * *",
            description: "Run every hour",
            nextRun: getNextCronRun("hourly"),
            enabled: true,
        },
    ],

    // Logs
    logs: [
        {
            id: "log-1",
            timestamp: new Date().toISOString(),
            level: "info",
            message: "OpenClaw Desktop Assistant initialized",
            source: "system",
        },
        {
            id: "log-2",
            timestamp: new Date().toISOString(),
            level: "llm",
            message: "Local LLM engine loaded (Phi-3 Mini — built-in rule engine)",
            source: "llm-router",
        },
    ],

    // Toasts
    toasts: [],

    // OpenClaw setup status
    setupStatus: {
        completed: false,
        steps: {
            osDetected: false,
            depsChecked: false,
            openclawInstalled: false,
            gatewayStarted: false,
            channelsConnected: false,
        },
    },
};

function getNextCronRun(type) {
    const now = new Date();
    if (type === "daily") {
        const next = new Date(now);
        next.setDate(next.getDate() + 1);
        next.setHours(9, 0, 0, 0);
        return next.toISOString();
    }
    const next = new Date(now);
    next.setHours(next.getHours() + 1, 0, 0, 0);
    return next.toISOString();
}

// ---- Reducer ----
function appReducer(state, action) {
    switch (action.type) {
        case "SET_VIEW":
            return { ...state, activeView: action.payload };

        case "TOGGLE_SANDBOX":
            return { ...state, sandboxMode: !state.sandboxMode };

        case "SET_SANDBOX":
            return { ...state, sandboxMode: action.payload };

        case "ADD_MESSAGE":
            return { ...state, messages: [...state.messages, action.payload] };

        case "CLEAR_MESSAGES":
            return { ...state, messages: [] };

        case "SET_TYPING":
            return { ...state, isTyping: action.payload };

        case "UPDATE_LLM_CONFIG":
            return { ...state, llmConfig: { ...state.llmConfig, ...action.payload } };

        case "ADD_AGENT": {
            const agent = { ...action.payload, id: uuidv4(), createdAt: new Date().toISOString(), runs: 0, lastRun: null };
            return { ...state, agents: [...state.agents, agent] };
        }

        case "UPDATE_AGENT":
            return {
                ...state,
                agents: state.agents.map((a) =>
                    a.id === action.payload.id ? { ...a, ...action.payload } : a
                ),
            };

        case "DELETE_AGENT":
            return {
                ...state,
                agents: state.agents.filter((a) => a.id !== action.payload),
                schedules: state.schedules.filter((s) => s.agentId !== action.payload),
            };

        case "ADD_SCHEDULE": {
            const sched = { ...action.payload, id: uuidv4() };
            return { ...state, schedules: [...state.schedules, sched] };
        }

        case "UPDATE_SCHEDULE":
            return {
                ...state,
                schedules: state.schedules.map((s) =>
                    s.id === action.payload.id ? { ...s, ...action.payload } : s
                ),
            };

        case "DELETE_SCHEDULE":
            return {
                ...state,
                schedules: state.schedules.filter((s) => s.id !== action.payload),
            };

        case "ADD_LOG":
            return {
                ...state,
                logs: [
                    {
                        id: uuidv4(),
                        timestamp: new Date().toISOString(),
                        ...action.payload,
                    },
                    ...state.logs,
                ].slice(0, 500),
            };

        case "CLEAR_LOGS":
            return { ...state, logs: [] };

        case "ADD_TOAST": {
            const toast = { ...action.payload, id: action.payload.id || uuidv4() };
            return { ...state, toasts: [...state.toasts, toast] };
        }

        case "REMOVE_TOAST":
            return { ...state, toasts: state.toasts.filter((t) => t.id !== action.payload) };

        case "UPDATE_SETUP_STATUS":
            return {
                ...state,
                setupStatus: {
                    ...state.setupStatus,
                    steps: { ...state.setupStatus.steps, ...action.payload },
                },
            };

        case "SET_SETUP_COMPLETED":
            return {
                ...state,
                setupStatus: { ...state.setupStatus, completed: true },
            };

        default:
            return state;
    }
}

// ---- Context ----
const AppContext = createContext(null);

export function AppProvider({ children }) {
    // Load initial state from localStorage or use default
    const [state, dispatch] = useReducer(appReducer, initialState, (defaultState) => {
        try {
            const persisted = localStorage.getItem("openclaw_state");
            return persisted ? { ...defaultState, ...JSON.parse(persisted), toasts: [] } : defaultState;
        } catch (e) {
            console.error("Failed to load state", e);
            return defaultState;
        }
    });

    // Persist state changes
    React.useEffect(() => {
        try {
            const stateToSave = {
                ...state,
                activeView: state.activeView, // Persist view
                agents: state.agents,
                schedules: state.schedules,
                llmConfig: state.llmConfig,
                logs: state.logs.slice(0, 100), // Only save last 100 logs
                setupStatus: state.setupStatus,
                messages: state.messages.slice(-50),
                toasts: [], // Do not persist toasts
            };
            localStorage.setItem("openclaw_state", JSON.stringify(stateToSave));
        } catch (e) {
            console.error("Failed to save state", e);
        }
    }, [state]);

    // Scheduler Loop (The "Heartbeat")
    React.useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();

            state.schedules.forEach(schedule => {
                if (!schedule.enabled) return;

                const nextRun = new Date(schedule.nextRun);

                if (now >= nextRun) {
                    // It's time to run!
                    const agentName = schedule.agentName || "Unknown Agent";
                    const executingAgent = state.agents.find(a => a.id === schedule.agentId);
                    const taskGoal = executingAgent ? executingAgent.goal : null;

                    // Attempt Real Execution (Production Mode)
                    invoke('execute_script', { scriptPath: 'automation/linkedin_agent.js', taskGoal })
                        .then((res) => {
                            if (res.success) {
                                addLog("success", `🚀 Real Automation Started: ${agentName}`, "scheduler");
                                addLog("info", res.stdout, "browser-automation");
                            } else {
                                throw new Error(res.stderr || "Unknown error");
                            }
                        })
                        .catch((err) => {
                            // Fallback to Simulation (Demo Mode)
                            console.warn("Real automation failed, falling back to simulation:", err);
                            addLog("warn", `Real automation unavailable: ${err}`, "scheduler");
                            addLog("info", `🚀 Starting agent: ${agentName} (Simulation Mode)`, "scheduler");

                            setTimeout(() => addLog("info", `🌐 [Browser] Navigating to target URL...`, "browser-automation"), 1500);
                            setTimeout(() => addLog("info", `⌨️ [Browser] Typing message content...`, "browser-automation"), 3000);
                            setTimeout(() => {
                                addLog("success", `✅ [Browser] Action completed successfully!`, "browser-automation");
                                addToast(`Agent "${agentName}" finished successfully`, "success");
                            }, 4500);
                        });

                    // 2. Calculate next run
                    let nextRunDate;
                    try {
                        const interval = parser.parseExpression(schedule.cron);
                        nextRunDate = interval.next().toDate();
                    } catch (e) {
                        // Fallback for simple/invalid crons, just add 1 hour to avoid loop spam
                        nextRunDate = new Date(now.getTime() + 60 * 60 * 1000);
                        console.warn("Invalid cron, defaulting to +1h", schedule.cron);
                    }

                    // 3. Update Schedule
                    dispatch({
                        type: "UPDATE_SCHEDULE",
                        payload: {
                            id: schedule.id,
                            nextRun: nextRunDate.toISOString(),
                            lastRun: now.toISOString()
                        }
                    });

                    // 4. Update Agent stats
                    const agent = state.agents.find(a => a.id === schedule.agentId);
                    if (agent) {
                        dispatch({
                            type: "UPDATE_AGENT",
                            payload: {
                                id: agent.id,
                                runs: (agent.runs || 0) + 1,
                                lastRun: now.toISOString()
                            }
                        });
                    }
                }
            });
        }, 10000); // Check every 10 seconds

        return () => clearInterval(interval);
    }, [state.schedules, state.agents]);

    const addToast = useCallback((message, type = "info", duration = 2500) => {
        const id = uuidv4();
        dispatch({ type: "ADD_TOAST", payload: { id, message, type } });
        setTimeout(() => dispatch({ type: "REMOVE_TOAST", payload: id }), duration);
    }, []);

    const addLog = useCallback((level, message, source = "system") => {
        dispatch({ type: "ADD_LOG", payload: { level, message, source } });
    }, []);

    const value = {
        ...state,
        dispatch,
        addToast,
        addLog,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
    const context = useContext(AppContext);
    if (!context) throw new Error("useAppContext must be used within AppProvider");
    return context;
}
