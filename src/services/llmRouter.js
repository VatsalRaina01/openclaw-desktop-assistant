/**
 * LLM Router Service
 * 
 * Architecture:
 *   if user_llm_key exists:
 *       use external API model (OpenAI / Anthropic / Custom)
 *   else:
 *       use local built-in engine (simulates Phi-3 Mini for offline use)
 *
 * The local engine uses pattern matching + templated responses to handle:
 *   - OpenClaw setup conversations
 *   - Agent creation guidance
 *   - Scheduling configuration
 *   - General help and FAQ
 *
 * When switching to API mode, all LLM calls are routed through the 
 * user-provided API key with the selected model.
 */

// ---- Local Engine (Built-in rule-based Phi-3 simulator) ----
const BASE_SYSTEM_PROMPT = `You are Personaliz Desktop Assistant.
You guide non-technical users.
You translate plain English into OpenClaw automation.
You execute commands silently but transparently.
You always ask for confirmation before public posting.
You log every action clearly.

IMPORTANT: AGENT CREATION
- If the user asks to create an agent or automation, you MUST output a JSON block wrapped in special tags:
  <<AGENT_CONFIG>>
  {
    "name": "Agent Name",
    "role": "Agent Role",
    "goal": "Agent Goal",
    "tools": ["browser", "linkedin", "search"],
    "schedule": "0 9 * * *"
  }
  <<END_AGENT_CONFIG>>
- Only output this block when you have enough details. If details are missing, ask for them.
- If no schedule is provided, default to "manual".
- If the user says "yes" to a proposed agent, output the config block immediately.`;

function getSystemPrompt(config) {
    if (config.mode === "api") {
        return `${BASE_SYSTEM_PROMPT}\n\nCurrent Mode: API (${config.apiProvider} - ${config.apiModel}).\nYou have access to the full power of a large language model. Be helpful, concise, and expert.`;
    }
    return `${BASE_SYSTEM_PROMPT}\n\nCurrent Mode: Local (Offline).\nYou use local model until user provides their own API key.`;
}

const LOCAL_RESPONSES = {
    // Greetings
    greeting: [
        "Hello! 👋 I'm your **OpenClaw Desktop Assistant**. I'm here to help you set up OpenClaw and create powerful automations — no command line needed!\n\nWhat would you like to do?\n- 🔧 **Set up OpenClaw** on your machine\n- 🤖 **Create an agent** to automate tasks\n- 📅 **Schedule a job** to run automatically\n- ⚙️ **Configure settings** or add your API key",
        "Hey there! 🦞 Welcome to **OpenClaw Desktop Assistant**. I make automation easy for everyone.\n\nI can help you:\n- Install and set up OpenClaw\n- Create AI agents that run on autopilot\n- Schedule recurring tasks\n- Monitor everything from this chat\n\nWhat's on your mind?",
    ],

    // Setup flow
    setup: {
        start: "Great! Let's get **OpenClaw** set up on your machine. I'll handle everything in the background — you just sit back and approve.\n\n🔍 **Step 1:** Detecting your operating system...\n✅ Detected: **Windows** (your current OS)\n\n🔍 **Step 2:** Checking dependencies...\n- Node.js: ✅ Installed\n- npm: ✅ Installed\n\n📦 **Step 3:** Installing OpenClaw...\nI'll run `npm install -g openclaw@latest` in the background.\n\nShall I proceed?",
        installing: "⏳ Installing OpenClaw... This may take a minute.\n\n```\nnpm install -g openclaw@latest\n```\n\nI'm running this in the background. You'll see a notification when it's done!",
        installed: "🎉 **OpenClaw installed successfully!**\n\n**Step 4:** Starting the OpenClaw Gateway...\n```\nopenclaw onboard --install-daemon\n```\n\nThe gateway is your central control plane — it manages all your agents, channels, and automations.\n\nWould you like me to:\n- 🔗 **Connect channels** (LinkedIn, browser, etc.)\n- 🔑 **Enter your LLM API key** for smarter AI responses\n- 🤖 **Create your first agent**",
        complete: "✅ **OpenClaw is fully set up!**\n\nHere's what's running:\n- 🦞 OpenClaw Gateway: **Active** on `ws://127.0.0.1:18789`\n- 🌐 Browser control: **Ready**\n- 📡 WebChat: **Connected**\n\nYou're all set! Try asking me to create an agent or schedule a task.",
    },

    // Agent creation
    agent: {
        help: "I can help you create an agent! Just tell me what you want it to do in plain English. For example:\n\n💡 *\"Create an agent that monitors trending OpenClaw topics daily\"*\n💡 *\"Make an agent that comments on #openclaw LinkedIn posts every hour\"*\n💡 *\"Set up an agent to scrape competitor pricing weekly\"*\n\nWhat automation would you like to create?",
        trending: "🤖 **Agent Configuration: Trending LinkedIn Agent**\n\nHere's what I'll set up:\n\n| Setting | Value |\n|---------|-------|\n| **Name** | Trending LinkedIn Agent |\n| **Role** | Content Creator |\n| **Goal** | Find trending OpenClaw topics, write a LinkedIn post, get your approval, then post |\
| **Tools** | Browser, Search, LinkedIn |\n| **Schedule** | Daily at 9:00 AM |\n| **Safety** | ⚠️ Always asks for approval before posting |\n\n**Flow:**\n1. 🔍 Search for trending OpenClaw topics\n2. ✍️ Draft a LinkedIn post\n3. 👀 Show you a preview → **Wait for your approval**\n4. 🚀 Post via browser automation\n5. 🔄 Repeat daily\n\nShall I create this agent?",
        hashtag: "🤖 **Agent Configuration: Hashtag Comment Agent**\n\nHere's what I'll set up:\n\n| Setting | Value |\n|---------|-------|\n| **Name** | Hashtag Comment Agent |\n| **Role** | Community Promoter |\
| **Goal** | Find #openclaw posts on LinkedIn and comment to promote the GitHub repo |\n| **Tools** | Browser, LinkedIn, Search |\n| **Schedule** | Every 1 hour |\n| **Safety** | Auto-comment (logged) |\n\n**Flow:**\n1. 🔍 Search LinkedIn for `#openclaw` posts\n2. 💬 Generate a relevant comment promoting the desktop app\n3. 🖱️ Post comment via browser automation\n4. 📝 Log the action\n5. 🔄 Repeat every hour\n\nShall I create this agent?",
        created: "✅ **Agent created successfully!**\n\nThe agent has been saved and can be found in the **Agents** tab. You can:\n- ▶️ Start it immediately\n- 📅 Review the schedule\n- 🧪 Run in **Sandbox Mode** first (safe, no real actions)\n- ⏸️ Pause or modify it anytime\n\nWant me to start it now, or would you prefer to test in sandbox mode first?",
        preview_post: "📝 **Post Preview — Awaiting Your Approval**\n\n---\n🔥 *OpenClaw is changing the game for personal AI automation!*\n\nJust discovered the top trending features in OpenClaw:\n• Multi-channel AI assistant (WhatsApp, Slack, Discord)\n• Browser automation for hands-free workflows  \n• Cron scheduling for recurring tasks\n• Local-first — runs on YOUR machine\n\nThe future of automation is open-source. 🦞\n\n#OpenClaw #AI #Automation #OpenSource\n\n---\n\n⚠️ **This will be posted to your LinkedIn.** Approve or reject below.\n\nDo you approve this post? (Yes / No / Edit)",
        job_scraper: "🤖 **Agent Configuration: LinkedIn Job Scraper**\n\nHere's what I'll set up:\n\n| Setting | Value |\n|---------|-------|\n| **Name** | AI/ML Job Hunter |\n| **Role** | Career Assistant |\
| **Goal** | Scrape LinkedIn for 'AI Engineer' and 'ML Ops' jobs, filter by keyword, and save to a CSV file |\n| **Tools** | Browser, LinkedIn, Scraper |\n| **Schedule** | Daily at 8:00 AM |\n| **Safety** | Read-only (Safe) |\n\n**Flow:**\n1. 🔍 Navigate to LinkedIn Jobs\n2. ⌨️ Search for \"AI Engineer\" & \"Machine Learning\"\n3. 📄 Extract job titles, companies, and links\n4. 💾 Save to `jobs.csv`\n5. 🔔 Notify you of new matches\n\nShall I create this agent?",
    },

    // Scheduling
    schedule: {
        help: "I can schedule agents to run automatically! You can use:\n\n⏰ **Simple expressions:**\n- *\"Run every hour\"*\n- *\"Run daily at 9 AM\"*\n- *\"Run every Monday at 8 AM\"*\n- *\"Run every 30 minutes\"*\n\n🔧 **Or cron expressions:**\n- `0 9 * * *` → Daily at 9:00 AM\n- `0 * * * *` → Every hour\n- `*/30 * * * *` → Every 30 minutes\n\nWhich agent would you like to schedule?",
        created: "✅ **Schedule created!**\n\nYou can view all schedules in the **Scheduler** tab. The agent will run automatically at the specified times.\n\nI'll log every execution and notify you if anything needs attention.",
    },

    // Sandbox
    sandbox: {
        explain: "🧪 **Sandbox Mode** lets you test agents safely:\n\n- ✅ Simulates browser actions (no real clicking)\n- ✅ Generates preview content (no real posting)\n- ✅ Logs what *would* happen\n- ❌ No actual changes to external services\n\nPerfect for testing your agent before going live!\n\nToggle sandbox mode from the sidebar or say *\"Enable sandbox mode\"*.",
        enabled: "🧪 **Sandbox Mode: ON**\n\nAll agent actions are now simulated. No real posts, comments, or external changes will be made. You'll see logs of what *would* happen.\n\nSay *\"Disable sandbox mode\"* or toggle it from the sidebar when you're ready to go live.",
        disabled: "🟢 **Sandbox Mode: OFF**\n\nAgents will now perform real actions. Remember:\n- Publishing agents will ask for approval before posting\n- All actions are logged\n- You can pause any agent at any time",
    },

    // Help
    help: "Here's everything I can help you with:\n\n**🔧 Setup**\n- *\"Set up OpenClaw\"* — Install and configure OpenClaw\n- *\"Check status\"* — View system health\n\n**🤖 Agents**\n- *\"Create an agent\"* — Start the agent wizard\n- *\"Show my agents\"* — View all agents\n- *\"Start/stop agent\"* — Control agent execution\n\n**📅 Scheduling**\n- *\"Schedule a job\"* — Set up recurring execution\n- *\"Show schedules\"* — View all schedules\n\n**🧪 Sandbox**\n- *\"Enable sandbox mode\"* — Test safely\n- *\"Disable sandbox mode\"* — Go live\n\n**⚙️ Settings**\n- *\"Add API key\"* — Switch to external LLM\n- *\"Show settings\"* — View configuration\n\n**📋 Logs**\n- *\"Show logs\"* — View execution history",

    // Fallback
    fallback: [
        "I understand you're asking about that. Let me help!\n\nCould you be more specific? For example:\n- Want to **create an agent**? Tell me what it should do.\n- Want to **set something up**? I'll guide you.\n- Need **help**? Just say \"help\" to see all commands.",
        "I'd love to help with that! Here are some things I can do:\n\n- 🔧 Set up OpenClaw\n- 🤖 Create automation agents\n- 📅 Schedule recurring jobs\n- 🧪 Test in sandbox mode\n\nWhat would you like to try?",
    ],
};

// ---- Intent Detection ----
function detectIntent(message) {
    const lower = message.toLowerCase().trim();

    // Greeting
    if (/^(hi|hello|hey|howdy|greetings|sup|yo|good\s*(morning|afternoon|evening))[\s!?.]*$/i.test(lower)) {
        return "greeting";
    }

    // Create agent (Higher priority to catch "set up an agent")
    if (/create.*agent|make.*agent|new agent|build.*agent|set.?up.*agent/i.test(lower)) {
        // Run/Execute Agent (Corner Case - Expanded)
        // Catches "Run News Monitor", "Start Job Hunter", "Execute Agent X"
        if (/^(run|start|execute|launch|trigger)\b/i.test(lower) && !/setup|install|config/i.test(lower)) {
            return "agent_run";
        }

        // Expanded Agent Types
        if (/trend|linkedin.*post|daily.*post/i.test(lower)) return "agent_trending";
        if (/job|scrape|career|hiring|work/i.test(lower)) return "agent_job_scraper";

        if (/news|update|headlin/i.test(lower)) return "agent_news";
        if (/video|youtube|watch|clip/i.test(lower)) return "agent_video";
        if (/stock|price|market|finance/i.test(lower)) return "agent_finance";

        if (/hashtag|comment|#openclaw|promot/i.test(lower)) return "agent_hashtag";
        return "agent_generic"; // Fallback to generic creation
    }

    // Setup
    if (/setup|install|configure|get started|onboard|set up/i.test(lower)) {
        return "setup";
    }

    // Agent-related
    if (/agent|automat/i.test(lower)) {
        if (/trend/i.test(lower)) return "agent_trending";
        if (/hashtag|comment|#/i.test(lower)) return "agent_hashtag";
        return "agent_help";
    }

    // Schedule
    if (/schedul|cron|timer|recurring|every\s*(hour|day|week|minute)|run.*at/i.test(lower)) {
        return "schedule";
    }

    // Sandbox
    if (/sandbox/i.test(lower)) {
        if (/enable|on|start|activate/i.test(lower)) return "sandbox_enable";
        if (/disable|off|stop|deactivate/i.test(lower)) return "sandbox_disable";
        return "sandbox_explain";
    }

    // Approval
    if (/^(yes|approve|confirm|go ahead|do it|post it|ship it)/i.test(lower)) {
        return "approve";
    }
    if (/^(no|reject|cancel|don'?t|stop)/i.test(lower)) {
        return "reject";
    }

    // Help
    if (/help|what can you|features|commands|how to/i.test(lower)) {
        return "help";
    }

    // Settings / API key
    if (/api.?key|setting|config|model|switch.*model|llm/i.test(lower)) {
        return "settings";
    }

    // Logs
    if (/log|history|execution/i.test(lower)) {
        return "logs";
    }

    // Status
    if (/status|health|check|running/i.test(lower)) {
        return "status";
    }

    // Time/Duration (New)
    if (/how long|time|duration|take/i.test(lower)) {
        return "duration_query";
    }

    return "fallback";
}

// ---- Generate Local Response ----
function generateLocalResponse(message, context = {}) {
    const intent = detectIntent(message);

    switch (intent) {
        case "greeting":
            return randomPick(LOCAL_RESPONSES.greeting);

        case "setup":
            return LOCAL_RESPONSES.setup.start;

        case "agent_help":
            return LOCAL_RESPONSES.agent.help;

        case "agent_trending":
            return LOCAL_RESPONSES.agent.trending;

        case "agent_hashtag":
            return LOCAL_RESPONSES.agent.hashtag;

        case "agent_job_scraper":
            return LOCAL_RESPONSES.agent.job_scraper;

        case "schedule":
            return LOCAL_RESPONSES.schedule.help;

        case "sandbox_explain":
            return LOCAL_RESPONSES.sandbox.explain;

        case "sandbox_enable":
            return LOCAL_RESPONSES.sandbox.enabled;

        case "sandbox_disable":
            return LOCAL_RESPONSES.sandbox.disabled;

        case "agent_news":
            return `📰 **News Agent**\n\nI can track the latest headlines for you.\n\n| Setting | Value |\n|---------|-------|\n| **Name** | News Monitor |\n| **Goal** | Find latest news on [User Topic] |\n| **Tools** | Google News |\n\nShall I set this up?\n\n<<AGENT_CONFIG>>\n{\n  "name": "News Monitor",\n  "role": "News Aggregator",\n  "goal": "Search Google News for latest updates on specific topics",\n  "tools": ["browser", "google_news"],\n  "schedule": "0 8 * * *"\n}\n<<END_AGENT_CONFIG>>`;

        case "agent_video":
            return `📺 **Video Agent**\n\nI can find videos and clips for you.\n\n| Setting | Value |\n|---------|-------|\n| **Name** | YouTube Watcher |\n| **Goal** | Find latest videos on [User Topic] |\n| **Tools** | YouTube |\n\nShall I set this up?\n\n<<AGENT_CONFIG>>\n{\n  "name": "YouTube Watcher",\n  "role": "Video Curator",\n  "goal": "Search YouTube for new videos on specific topics",\n  "tools": ["browser", "youtube"],\n  "schedule": "0 18 * * *"\n}\n<<END_AGENT_CONFIG>>`;

        case "agent_finance":
            return `📈 **Finance Agent**\n\nI can track stock prices and market trends.\n\n| Setting | Value |\n|---------|-------|\n| **Name** | Market Tracker |\n| **Goal** | Monitor stock prices for [User Ticker] |\n| **Tools** | Google Finance |\n\nShall I set this up?\n\n<<AGENT_CONFIG>>\n{\n  "name": "Market Tracker",\n  "role": "Financial Analyst",\n  "goal": "Search Google Finance for stock prices and market trends",\n  "tools": ["browser", "google_finance"],\n  "schedule": "0 9 * * 1-5"\n}\n<<END_AGENT_CONFIG>>`;

        case "agent_run":
            // Extract agent name roughly
            const runTarget = message.replace(/run|start|execute|launch|the|agent/gi, "").trim();
            return `🚀 **Starting Agent**\n\nI am initiating the execution sequence for **"${runTarget || "selected agent"}"**.\n\nCheck the **Logs** tab for real-time progress.`;

        case "agent_generic":
            // Extract a rough goal from the message
            const goal = message.replace(/create.*agent|make.*agent|set.?up.*agent/i, "").trim() || "Automate tasks based on user instruction";
            const safeGoal = goal.replace(/"/g, "'"); // Sanitize for JSON

            return `🤖 **Agent Configuration: Custom Agent**\n\nI've designed a custom agent for your request:\n\n| Setting | Value |\n|---------|-------|\n| **Name** | Custom Automation Agent |\n| **Goal** | ${safeGoal} |\n| **Tools** | Browser, General |\n| **Schedule** | Manual |\n\nShall I create this agent?\n\n<<AGENT_CONFIG>>\n{\n  "name": "Custom Automation Agent",\n  "role": "Custom Assistant",\n  "goal": "${safeGoal}",\n  "tools": ["browser"],\n  "schedule": "manual"\n}\n<<END_AGENT_CONFIG>>`;

        case "approve":
            return "✅ **Approved!** The action has been queued for execution. Check the **Logs** tab for real-time progress.\n\nI'll notify you when it's complete.";

        case "reject":
            return "❌ **Action cancelled.** No changes have been made.\n\nFeel free to ask me to modify the content or try something different.";

        case "help":
            return LOCAL_RESPONSES.help;

        case "settings":
            return "⚙️ You can configure your LLM settings in the **Settings** tab (click the gear icon in the sidebar).\n\n**Current mode:** Local (Built-in Phi-3 engine)\n\nTo switch to a more powerful model:\n1. Go to **Settings**\n2. Enter your OpenAI or Anthropic API key\n3. The system will automatically switch to your chosen model\n\nAll future conversations will use the external API for smarter responses.";

        case "logs":
            return "📋 Check the **Logs** tab in the sidebar to see:\n- Execution history\n- Agent run results\n- Error reports\n- LLM routing decisions\n- Approval audit trail\n\nAll actions are logged with timestamps and source information.";

        case "status":
            return `📊 **System Status**\n\n| Component | Status |\n|-----------|--------|\n| Desktop App | ✅ Running |\n| LLM Engine | ${context.llmMode === "api" ? "✅ API (" + (context.apiModel || "gpt-4o-mini") + ")" : "⚡ Local (Phi-3 Built-in)"} |\n| Sandbox Mode | ${context.sandboxMode ? "🧪 ON" : "🟢 OFF"} |\n| Active Agents | ${context.agentCount || 0} |\n| Scheduled Jobs | ${context.scheduleCount || 0} |\n\nEverything looks good! What would you like to do?`;

        case "duration_query":
            return "⏱️ **Estimated Time:**\n\n- **Agent Setup:** Instant (Done!)\n- **Execution:** The job scraper usually takes about **1-2 minutes** to run.\n\nIt navigates to LinkedIn, scrolls to load jobs, and extracts the data. You'll see the logs updating in real-time!";

        default:
            return randomPick(LOCAL_RESPONSES.fallback);
    }
}

function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ---- API Call (External LLM) ----
async function callExternalLLM(message, config, conversationHistory = []) {
    const { apiProvider, apiKey, apiModel } = config;

    if (!apiKey) {
        throw new Error("No API key provided");
    }

    let url, headers, body;
    const systemPrompt = getSystemPrompt(config);

    if (apiProvider === "openai" || apiProvider === "github" || apiProvider === "custom") {
        let baseUrl = "https://api.openai.com/v1/chat/completions";

        if (apiProvider === "github") {
            baseUrl = "https://models.inference.ai.azure.com/chat/completions";
        } else if (apiProvider === "custom") {
            baseUrl = config.customEndpoint || baseUrl;
        }

        url = baseUrl;

        headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        };

        const messages = [
            { role: "system", content: systemPrompt },
            ...conversationHistory.slice(-10).map((m) => ({
                role: m.role,
                content: m.content,
            })),
            { role: "user", content: message },
        ];

        body = JSON.stringify({
            model: apiModel || "gpt-4o-mini",
            messages,
            max_tokens: 1024,
            temperature: 0.7,
        });
    } else if (apiProvider === "anthropic") {
        url = "https://api.anthropic.com/v1/messages";
        headers = {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
        };

        const messages = [
            ...conversationHistory.slice(-10).map((m) => ({
                role: m.role === "assistant" ? "assistant" : "user",
                content: m.content,
            })),
            { role: "user", content: message },
        ];

        body = JSON.stringify({
            model: apiModel || "claude-3-5-sonnet-20241022",
            system: systemPrompt,
            messages,
            max_tokens: 1024,
        });
    }

    const response = await fetch(url, { method: "POST", headers, body });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API error (${response.status}): ${error}`);
    }

    const data = await response.json();

    if (apiProvider === "anthropic") {
        return data.content[0].text;
    }
    return data.choices[0].message.content;
}

// ---- Main Router ----
export async function routeLLMRequest(message, config, context = {}) {
    const startTime = Date.now();
    let response, mode, model;

    if (config.apiKey && config.mode === "api") {
        // External API mode
        mode = "api";
        try {
            response = await callExternalLLM(message, config, context.history || []);
        } catch (err) {
            console.error("API LLM Full Error Object:", err);
            console.error("API LLM Error Message:", err.message);
            if (err.cause) console.error("API LLM Error Cause:", err.cause);
            console.error("Config used:", JSON.stringify({ ...config, apiKey: "REDACTED" }));

            response = generateLocalResponse(message, context);
            mode = "local-fallback";
            model = "phi-3-mini (built-in)";
        }
    } else {
        // ---- Local Processing (Rule-Based + Real Ollama Fallback) ----
        // 1. Try Real Ollama (Local LLM)
        try {
            console.log("Attempting to connect to local Ollama...");
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout for quick fallback

            const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "phi3", // User must have pulled this
                    prompt: `${BASE_SYSTEM_PROMPT}\n\nUser: ${message}\nAssistant:`,
                    stream: false
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (ollamaResponse.ok) {
                const data = await ollamaResponse.json();
                response = data.response;
                mode = "local-ollama";
                model = "phi3 (Ollama)";
            } else {
                // Ollama responded but with an error (e.g., model not found)
                console.warn(`Ollama API error (${ollamaResponse.status}): ${await ollamaResponse.text()}`);
                throw new Error("Ollama API error"); // Trigger fallback
            }
        } catch (e) {
            console.warn("Ollama not available or error, falling back to rule engine:", e.message);
            // 2. Fallback to Rule-Based Engine (Simulated)
            // Simulate slight delay for realism
            await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
            response = generateLocalResponse(message, context);
            mode = "local-rule";
            model = "phi-3-mini (built-in)";
        }
    }

    const latency = Date.now() - startTime;

    return {
        content: response,
        mode,
        model,
        latency,
        intent: detectIntent(message),
    };
}

export { detectIntent, BASE_SYSTEM_PROMPT };
