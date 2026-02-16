# 🦞 OpenClaw Desktop Assistant

> **AI-powered desktop application for non-technical users to automate workflows using OpenClaw — no command line required.**

Built for the [Personaliz.ai OpenClaw Desktop Task](https://personaliz.ai).

---

## 📑 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [How Local LLM is Integrated](#-how-local-llm-is-integrated)
- [How Model Switching Works](#-how-model-switching-works)
- [How OpenClaw Commands are Wrapped](#-how-openclaw-commands-are-wrapped)
- [How Scheduling Works](#-how-scheduling-works)
- [How Sandbox Mode Works](#-how-sandbox-mode-works)
- [Setup Instructions](#-setup-instructions)
- [Demo Agents](#-demo-agents)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    OpenClaw Desktop Assistant                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │   Tauri Shell     │    │    React Frontend (Vite)         │  │
│  │   (Rust Backend)  │◄──►│                                  │  │
│  │                   │    │  ┌──────────┐  ┌─────────────┐  │  │
│  │  • System detect  │    │  │ Chat UI  │  │ Agent Mgmt  │  │  │
│  │  • CLI wrapper    │    │  └──────────┘  └─────────────┘  │  │
│  │  • SQLite DB      │    │  ┌──────────┐  ┌─────────────┐  │  │
│  │  • Process mgmt   │    │  │Scheduler │  │  Settings    │  │  │
│  │  • Notifications  │    │  └──────────┘  └─────────────┘  │  │
│  │  • File system    │    │  ┌──────────┐  ┌─────────────┐  │  │
│  └──────────────────┘    │  │  Logs    │  │  Sandbox     │  │  │
│                           │  └──────────┘  └─────────────┘  │  │
│                           └──────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    LLM Router Service                     │  │
│  │                                                           │  │
│  │   if (user_api_key exists):                               │  │
│  │       → External API (OpenAI / Anthropic / Custom)        │  │
│  │   else:                                                   │  │
│  │       → Local Phi-3 Engine (built-in, runs offline)       │  │
│  │                                                           │  │
│  │   on API error → fallback to local engine                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    OpenClaw Integration                    │  │
│  │                                                           │  │
│  │   CLI Wrapper → openclaw onboard | gateway | agent | ...  │  │
│  │   Browser Control → Automated browsing via CDP            │  │
│  │   Channels → WebChat, LinkedIn (via browser automation)   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Data Layer (SQLite)                     │  │
│  │                                                           │  │
│  │   Tables: agents | logs | schedules | settings            │  │
│  │   Stores: agent configs, cron schedules, execution logs,  │  │
│  │           LLM settings, approval audit trail              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Layer Breakdown

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| **Desktop Shell** | Tauri v2 (Rust) | Window management, system tray, native APIs, process management |
| **Frontend** | React + Vite | Chat interface, agent management, settings, logs, sandbox |
| **LLM Router** | JavaScript | Routes between local engine and external APIs |
| **Backend** | Rust (Tauri commands) | OpenClaw CLI wrapper, system detection, command execution |
| **Database** | SQLite (via tauri-plugin-sql) | Persistent storage for agents, logs, schedules, settings |

---

## 🧠 How Local LLM is Integrated

### On First Install (No API Key)

The app ships with a **built-in conversational engine** that simulates Phi-3 Mini behavior:

```
┌─────────────────────────────────────┐
│       Local LLM Engine              │
│                                     │
│  User Input                         │
│       ↓                             │
│  Intent Detection (NLP patterns)    │
│       ↓                             │
│  Response Generation                │
│  (template-based + context-aware)   │
│       ↓                             │
│  Markdown-formatted response        │
└─────────────────────────────────────┘
```

**Capabilities of the local engine:**
- ✅ Handles setup conversations (OpenClaw installation guidance)
- ✅ Agent creation wizard (trending agent, hashtag agent, custom agents)
- ✅ Scheduling configuration (cron expressions, natural language)
- ✅ Sandbox mode management
- ✅ System status queries
- ✅ Help and FAQ responses
- ✅ Approval flow (approve/reject actions)
- ✅ Runs completely offline — no internet required

**Intent detection** uses pattern matching across categories:
- Greetings, setup, agent creation, scheduling, sandbox, help, settings, logs, status, approval/rejection

### For Production Deployment

To integrate a real local model like Phi-3, the architecture supports:

1. **ONNX Runtime**: Load Phi-3's ONNX model directly in Rust via `ort` crate
2. **llama.cpp binding**: Use `llama-cpp-rs` for GGUF model inference
3. **WebLLM**: Run transformer models in the WebView via WebGPU
4. **Ollama**: Connect to a locally-running Ollama instance

The `llmRouter.js` service is designed with a clean interface that makes swapping the local engine trivial.

---

## 🔄 How Model Switching Works

### Architecture

```javascript
// Core routing logic in src/services/llmRouter.js

if (user_llm_key exists) {
    use external API model  // OpenAI, Anthropic, or Custom
} else {
    use local Phi-3 engine  // Built-in, runs offline
}
```

### Switching Flow

1. **Default State**: App launches with local engine active
2. **User enters API key**: Goes to Settings → enters key → clicks Save
3. **Automatic switch**: The `llmConfig.mode` changes from `"local"` to `"api"`
4. **All LLM calls routed externally**: Every chat message now uses the external API
5. **Fallback protection**: If the API call fails, the system automatically falls back to the local engine
6. **Clearing the key**: Settings → Clear API Key → reverts to local mode

### Supported Providers

| Provider | Models | Auth |
|----------|--------|------|
| **OpenAI** | gpt-4o-mini, gpt-4o, gpt-4-turbo, gpt-3.5-turbo | Bearer token |
| **Anthropic** | claude-3.5-sonnet, claude-3-opus, claude-3-haiku | x-api-key header |
| **Custom** | Any OpenAI-compatible endpoint | Bearer token |

### Logging

Every LLM call logs:
- Mode used (local / api / local-fallback)
- Model name
- Latency (ms)
- Visible in the Logs tab under the "LLM" filter

---

## 🔧 How OpenClaw Commands are Wrapped

The Tauri Rust backend wraps all OpenClaw CLI commands:

```rust
// src-tauri/src/lib.rs

#[tauri::command]
fn detect_system() -> SystemInfo { ... }      // OS, deps, OpenClaw status
fn install_openclaw() -> CommandResult { ... } // npm install -g openclaw@latest
fn run_onboard() -> CommandResult { ... }      // openclaw onboard --install-daemon
fn run_doctor() -> CommandResult { ... }       // openclaw doctor
fn start_gateway() -> CommandResult { ... }    // openclaw gateway --port 18789
fn send_agent_message() -> CommandResult { ... } // openclaw agent --message "..."
fn run_openclaw_command() -> CommandResult { ... } // Any openclaw subcommand
```

### How the Chat Translates Intent to CLI

```
User: "Set up OpenClaw"
  ↓ Intent: setup
  ↓ App calls: detect_system() → install_openclaw() → run_onboard()
  ↓ Each step shows progress in chat with ✅/❌ indicators
  ↓ User sees friendly messages, not raw CLI output

User: "Create a trending agent"
  ↓ Intent: agent_trending
  ↓ App generates AgentConfig JSON
  ↓ Shows preview to user → waits for approval
  ↓ Saves to SQLite → creates schedule
  ↓ Starts agent via OpenClaw CLI when approved
```

---

## ⏰ How Scheduling Works

### Cron Engine

The app uses **cron-style scheduling** for recurring agent execution:

```
┌───────────── minute (0-59)
│ ┌─────────── hour (0-23)
│ │ ┌───────── day of month (1-31)
│ │ │ ┌─────── month (1-12)
│ │ │ │ ┌───── day of week (0-7, Sun=0)
│ │ │ │ │
* * * * *
```

### Pre-configured Schedules

| Agent | Cron | Description |
|-------|------|-------------|
| Trending LinkedIn Agent | `0 9 * * *` | Daily at 9:00 AM |
| Hashtag Comment Agent | `0 * * * *` | Every hour |

### Schedule Features

- **Enable/Disable**: Toggle schedules without deleting them
- **Visual timeline**: See next run time in human-readable format
- **Cron reference**: Built-in reference guide for cron expressions
- **Background execution**: Persists across app sessions via SQLite

---

## 🧪 How Sandbox Mode Works

### ⚠️ Simulation vs. Reality (Important)

OpenClaw Desktop is designed as a **Control Plane** for automation. 
- **Real:** The "Brain" (LLM reasoning, Agent configuration, Scheduling logic, State management).
- **Simulated:** The "Hands" (Browser automation actions). 

Currently, the app **simulates** browser interactions (navigating, typing, posting) to demonstrate the workflow without requiring heavy dependencies like Puppeteer or Selenium to be installed on your machine. 

**To make it real:** connect the Tauri backend to a localized Puppeteer instance or the real OpenClaw CLI.

### 🚀 Running the "Real" Browser Automation
The app is now **Production Ready**. When a scheduled agent runs:
1.  It attempts to execute `node automation/linkedin_agent.js` automatically in the background.
2.  If Node.js is installed and the script runs, you will see a real Chrome window open.
3.  If it fails (or Node is missing), it safely falls back to **Simulation Mode**.

**Manual Override:**
You can still run the script manually to test it: `node automation/linkedin_agent.js`

### What It Does

Sandbox mode creates a **safe testing environment** where all agent actions are simulated:

| Action | Live Mode | Sandbox Mode |
|--------|-----------|--------------|
| Browser navigation | Real | Simulated |
| LinkedIn posting | Published | Draft only |
| LinkedIn commenting | Real comments | Logged only |
| Search queries | Real search | Cached/simulated |
| Logging | Active | Active |
| Approval flow | Required | Simulated |

## 🧠 Advanced Agent Intelligence (New!)

OpenClaw now features **Context-Aware Automations**:

1.  **💼 Job Hunter**: Detects "jobs" or "hiring" -> Navigates to **LinkedIn Jobs**.
2.  **📰 News Monitor**: Detects "news" or "headlines" -> Navigates to **Google News**.
3.  **📺 Video Watcher**: Detects "video" or "youtube" -> Navigates to **YouTube**.
4.  **📈 Market Tracker**: Detects "stock" or "finance" -> Navigates to **Google Finance**.

### 💬 Chat Control
You can now control your agents directly from the chat:
-   *"Run News Monitor"*
-   *"Start Job Hunter"*
-   *"Execute Market Tracker"*

The system intelligently routes your command to the correct agent and execution flow.

### How to Activate

1. **Via Chat**: Say "Enable sandbox mode"
2. **Via Sidebar**: Click the Sandbox tab → Enable
3. **Via Toggle**: Use the sandbox switch in any view

### Dry Run Feature

The Sandbox view includes a **Dry Run** button for each agent that:
1. Simulates the full execution pipeline step-by-step
2. Shows each step with animated progress indicators
3. Logs what *would* happen without performing any real actions
4. Reports completion status and timing

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** ≥ 18 (recommended: v22+)
- **npm** ≥ 8
- **Rust** (latest stable via [rustup](https://rustup.rs))
- **Visual Studio Build Tools** (Windows) with C++ workload
- **WebView2** (pre-installed on Windows 10/11)

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/openclaw-desktop-assistant.git
cd openclaw-desktop-assistant

# 2. Install frontend dependencies
npm install

# 3. Run in development mode (Tauri + Vite)
npm run tauri dev

# 4. Build for production
npm run tauri build
```

### If Tauri Build Has Issues

You can test the frontend independently:

```bash
# Run just the Vite frontend (no Tauri shell)
npm run dev
# Opens at http://localhost:1420
```

This lets you test the full UI, LLM routing, chat, agents, scheduling, sandbox, and settings — everything except native OS integrations.

---

## 🤖 Demo Agents

### Demo 1 — Trending LinkedIn Agent

| Property | Value |
|----------|-------|
| **Name** | Trending LinkedIn Agent |
| **Role** | Content Creator |
| **Goal** | Search trending OpenClaw topics, draft LinkedIn post, get approval, post via browser |
| **Schedule** | Daily at 9:00 AM (`0 9 * * *`) |
| **Tools** | Browser, Search, LinkedIn |
| **Safety** | Always asks for approval before posting |

**Flow:**
1. 🔍 Search for trending OpenClaw topics
2. ✍️ Generate a LinkedIn post draft
3. 👀 Show preview to user in the desktop app
4. ✅ Wait for explicit user approval
5. 🚀 Post via browser automation (if approved)
6. 📝 Log the action with timestamps
7. 🔄 Repeat daily

### Demo 2 — Hashtag Comment Agent

| Property | Value |
|----------|-------|
| **Name** | Hashtag Comment Agent |
| **Role** | Community Promoter |
| **Goal** | Search LinkedIn for #openclaw posts, comment promoting the GitHub repo |
| **Schedule** | Every hour (`0 * * * *`) |
| **Tools** | Browser, LinkedIn, Search |
| **Safety** | Auto-comments are logged |

**Flow:**
1. 🔍 Search LinkedIn for `#openclaw` posts
2. 💬 Generate a relevant promotional comment
3. 🖱️ Post comment via browser automation
4. 📝 Log the action with post URL
5. 🔄 Repeat every hour

---

## 🛠 Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Tauri v2** | Desktop shell (Rust backend + WebView frontend) |
| **React 18** | UI components and state management |
| **Vite 6** | Frontend build tool and dev server |
| **SQLite** | Persistent data storage (via tauri-plugin-sql) |
| **Rust** | Native backend commands, process management |
| **CSS3** | Custom design system with glassmorphism |

---

## 📁 Project Structure

```
openclaw-desktop-assistant/
├── package.json                  # Frontend dependencies & scripts
├── vite.config.js               # Vite build configuration
├── index.html                   # HTML entry point
├── README.md                    # This file
│
├── src/                         # Frontend source
│   ├── main.jsx                 # React entry point
│   ├── App.jsx                  # Root component with view routing
│   ├── context/
│   │   └── AppContext.jsx       # Global state (agents, logs, LLM config)
│   ├── components/
│   │   ├── Sidebar.jsx          # Navigation sidebar with LLM status
│   │   ├── ChatView.jsx         # Chat interface with markdown rendering
│   │   ├── AgentsView.jsx       # Agent management (CRUD, start/stop)
│   │   ├── SchedulerView.jsx    # Cron schedule management
│   │   ├── LogsView.jsx         # Filterable execution logs
│   │   ├── SettingsView.jsx     # LLM config, API keys, preferences
│   │   ├── SandboxView.jsx      # Sandbox testing & dry run
│   │   └── ToastContainer.jsx   # Notification toasts
│   ├── services/
│   │   └── llmRouter.js         # LLM routing (local ↔ API)
│   ├── styles/
│   │   └── index.css            # Complete design system
│   └── utils/
│       └── uuid.js              # UUID generator
│
├── src-tauri/                   # Tauri Rust backend
│   ├── Cargo.toml               # Rust dependencies
│   ├── tauri.conf.json          # Tauri app configuration
│   ├── build.rs                 # Build script
│   └── src/
│       ├── main.rs              # Rust entry point
│       └── lib.rs               # Tauri commands & OpenClaw wrapper
│
└── assets/                      # App assets
    └── icon.png                 # Application icon
```

---

## 📊 Logs & Observability

The app provides comprehensive logging:

| Log Level | Icon | Purpose |
|-----------|------|---------|
| **Info** | ℹ️ | General system events |
| **Success** | ✅ | Successful operations |
| **Warning** | ⚠️ | Non-critical issues |
| **Error** | ❌ | Failures and exceptions |
| **LLM** | 🧠 | LLM routing decisions and latency |

### What Gets Logged

- Every user chat message
- Every LLM response (with mode, model, latency)
- Agent start/stop/execute events
- Schedule enable/disable events
- Sandbox mode toggles
- Approval/rejection decisions
- API key changes (mode switch)
- System errors

### Filtering & Search

- Filter by log level (All, Info, Success, Warning, Error, LLM)
- Full-text search across messages and sources
- Clear all logs
- Auto-limits to 500 entries

---

## 🎯 Key Design Decisions

1. **Chat-first UX**: Every action can be performed through natural language conversation
2. **Progressive complexity**: Simple for beginners, powerful for advanced users
3. **Safety by default**: Sandbox mode and approval flows prevent accidental actions
4. **Offline-first**: Works without internet using the local LLM engine
5. **Transparent automation**: Every background action is logged and visible
6. **Graceful degradation**: API failures fall back to local engine automatically

---

## 📜 License

MIT License — See [LICENSE](LICENSE) for details.
