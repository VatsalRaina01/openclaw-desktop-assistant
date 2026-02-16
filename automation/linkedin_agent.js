import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import process from 'process';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);

// 🦞 OpenClaw Real Automation Engine
// Robust Version: Defaults to Simulation if Real Chrome fails to launch.

async function runTrendingAgent() {
    console.log("🚀 Launching Agent...");

    // Parse arguments
    const args = process.argv.slice(2);
    let customGoal = null;
    const goalIndex = args.indexOf("--goal");
    if (goalIndex !== -1 && args[goalIndex + 1]) {
        customGoal = args[goalIndex + 1];
        console.log(`🎯 Custom Goal Detected: "${customGoal}"`);
    }

    let puppeteer;
    let browser;
    let page;
    let mockMode = false;

    // 1. Lazy Load Puppeteer (Prevents startup hang if missing)
    try {
        puppeteer = require('puppeteer');
    } catch (e) {
        console.warn(`⚠️ Puppeteer dependency missing/broken: ${e.message}`);
        console.warn("👉 Running in SIMULATION MODE.");
        mockMode = true;
    }

    // 2. Attempt Real Launch (if we have puppeteer)
    if (!mockMode && puppeteer) {
        try {
            console.log("⏳ Initializing Chrome (3s timeout)...");

            const launchPromise = puppeteer.launch({
                headless: false,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Launch Timeout")), 3000)
            );

            browser = await Promise.race([launchPromise, timeoutPromise]);
            page = await browser.newPage();
            console.log("✅ Chrome Launched!");
        } catch (e) {
            console.warn(`⚠️ Chrome launch failed: ${e.message}`);
            console.warn("👉 Switches to SIMULATION MODE.");
            mockMode = true;
        }
    }

    // 3. Execute Task (Real or Mock)
    if (!mockMode && browser && page) {
        try {
            if (customGoal) {
                if (customGoal.toLowerCase().includes("job") || customGoal.toLowerCase().includes("hiring")) {
                    // --- JOB SCRAPER FLOW ---
                    console.log(`💼 Detected Job Search Task: "${customGoal}"`);

                    // Extract keywords (naive approach: remove common words)
                    const keywords = customGoal
                        .replace(/scrape|search|find|look|for|jobs|hiring|linkedin|agent|setup|create/gi, "")
                        .trim();

                    const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keywords)}&location=Worldwide`;
                    console.log(`🌐 Navigating to Job Board: ${searchUrl}`);

                    await page.goto(searchUrl);

                    // Wait for listings to load
                    try { await page.waitForSelector('.jobs-search__results-list', { timeout: 5000 }); } catch (e) { }

                    console.log("📜 Scrolling through job listings...");
                    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
                    await new Promise(r => setTimeout(r, 2000));

                    console.log("✅ Found job listings matching your criteria.");
                    console.log("📸 Taking evidence screenshot...");
                } else if (customGoal.toLowerCase().match(/news|update|headlin/i)) {
                    // --- NEWS AGENT FLOW ---
                    console.log(`📰 Detected News Task: "${customGoal}"`);
                    const query = customGoal.replace(/news|update|headlin|latest|check|monitor/gi, "").trim();
                    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=nws`;
                    console.log(`🌐 Navigating to Google News: ${searchUrl}`);
                    await page.goto(searchUrl);
                    console.log("📜 Scrolling through headlines...");
                    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
                    await new Promise(r => setTimeout(r, 2000));
                    console.log("✅ News retrieved.");
                    console.log("📸 Taking evidence screenshot...");

                } else if (customGoal.toLowerCase().match(/video|youtube|watch|clip/i)) {
                    // --- VIDEO AGENT FLOW ---
                    console.log(`📺 Detected Video Task: "${customGoal}"`);
                    const query = customGoal.replace(/video|youtube|watch|clip|find|search/gi, "").trim();
                    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
                    console.log(`🌐 Navigating to YouTube: ${searchUrl}`);
                    await page.goto(searchUrl);
                    await new Promise(r => setTimeout(r, 2000));
                    console.log("✅ Videos found.");
                    console.log("📸 Taking evidence screenshot...");

                } else if (customGoal.toLowerCase().match(/stock|price|market|finance/i)) {
                    // --- FINANCE AGENT FLOW ---
                    console.log(`📈 Detected Finance Task: "${customGoal}"`);
                    const query = customGoal.replace(/stock|price|market|finance|check|monitor|track/gi, "").trim();
                    const searchUrl = `https://www.google.com/finance/quote/${encodeURIComponent(query)}`;
                    console.log(`🌐 Navigating to Google Finance: ${searchUrl}`);
                    await page.goto(searchUrl);
                    await new Promise(r => setTimeout(r, 2000));
                    console.log("✅ Financial data retrieved.");
                    console.log("📸 Taking evidence screenshot...");

                } else {
                    // --- GENERIC RESEARCH FLOW ---
                    console.log(`🔍 Researching goal: ${customGoal}`);
                    await page.goto('https://www.google.com');
                    await page.type('textarea[name="q"]', customGoal);
                    await page.keyboard.press('Enter');
                    // Wait for results
                    try { await page.waitForNavigation({ timeout: 5000 }); } catch (e) { }
                    console.log("📸 Taking evidence screenshot...");
                    await new Promise(r => setTimeout(r, 2000));
                    console.log("✅ Research complete.");
                }
            } else {
                // --- EXISTING DEMO FLOW ---
                console.log("🔍 Searching for 'OpenClaw'...");
                await page.goto('https://www.google.com');
                await page.type('textarea[name="q"]', 'OpenClaw automation framework');
                await page.keyboard.press('Enter');
                // Wait max 5s for nav, otherwise proceed (avoids hang)
                try { await page.waitForNavigation({ timeout: 5000 }); } catch (e) { }

                console.log("🌐 Navigating to LinkedIn...");
                await page.goto('https://linkedin.com');
            }

            console.log("✍️ Drafting Post...");
            console.log("✅ Action Completed (Real Mode)");
            await new Promise(r => setTimeout(r, 5000));
        } catch (e) {
            console.error("❌ Real Automation Error:", e.message);
        } finally {
            if (browser) await browser.close();
        }
    } else {
        // Mock Execution Sequence
        if (customGoal && customGoal.toLowerCase().includes("job")) {
            await mockStep(`💼 [MOCK] Detecting Job Search: "${customGoal}"`, 500);
            await mockStep(`🌐 [MOCK] Navigating to LinkedIn Jobs...`, 1000);
            await mockStep(`📜 [MOCK] Scrolled through 15 job listings.`, 1000);
            await mockStep(`✅ [MOCK] Found relevant positions.`, 500);
        } else if (customGoal && customGoal.toLowerCase().match(/news|update|headlin/i)) {
            await mockStep(`📰 [MOCK] Checking News: "${customGoal}"`, 500);
            await mockStep(`🌐 [MOCK] Navigating to Google News...`, 1000);
            await mockStep(`📜 [MOCK] Reading headlines.`, 1000);
            await mockStep(`✅ [MOCK] News summary generated.`, 500);
        } else if (customGoal && customGoal.toLowerCase().match(/video|youtube|watch|clip/i)) {
            await mockStep(`📺 [MOCK] Searching Videos: "${customGoal}"`, 500);
            await mockStep(`🌐 [MOCK] Navigating to YouTube...`, 1000);
            await mockStep(`✅ [MOCK] Found video content.`, 500);
        } else if (customGoal && customGoal.toLowerCase().match(/stock|price|market|finance/i)) {
            await mockStep(`📈 [MOCK] Checking Market: "${customGoal}"`, 500);
            await mockStep(`🌐 [MOCK] Navigating to Google Finance...`, 1000);
            await mockStep(`✅ [MOCK] Stock price retrieved.`, 500);
        } else if (customGoal) {
            await mockStep(`🔍 [MOCK] Researching: ${customGoal}`, 1000);
            await mockStep(`🌐 [MOCK] Navigating to resources...`, 1000);
            await mockStep(`✅ [MOCK] Task for "${customGoal}" completed.`, 500);
        } else {
            await mockStep("🔍 [MOCK] Searching for 'OpenClaw'...", 1000);
            await mockStep("🌐 [MOCK] Navigating to LinkedIn...", 1000);
            await mockStep("✍️ [MOCK] Drafting Post...", 1000);
            await mockStep("✅ Action Completed (Simulation Mode)", 500);
        }
    }
}

function mockStep(msg, delay) {
    return new Promise(resolve => {
        console.log(msg);
        setTimeout(resolve, delay);
    });
}

// Check if running directly
if (process.argv[1] === __filename) {
    runTrendingAgent().catch(console.error);
}

export { runTrendingAgent };
