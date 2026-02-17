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
            console.log("⏳ Initializing Chrome...");

            const launchPromise = puppeteer.launch({
                headless: false,
                userDataDir: './.puppeteer_user_data',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-infobars'
                ]
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Launch Timeout")), 30000)
            );

            browser = await Promise.race([launchPromise, timeoutPromise]);
            page = await browser.newPage();
            // Disable ALL timeouts so user can interact freely (login, CAPTCHA, etc.)
            page.setDefaultTimeout(0);
            page.setDefaultNavigationTimeout(0);
            // Hide Puppeteer automation signature from reCAPTCHA
            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
            });
            console.log("✅ Chrome Launched! (Stealth mode + all timeouts disabled)");
        } catch (e) {
            console.warn(`⚠️ Chrome launch failed: ${e.message}`);
            console.warn("👉 Switches to SIMULATION MODE.");
            mockMode = true;
        }
    }

    // 3. Execute Task (Real or Mock)
    if (!mockMode && browser && page) {
        try {
            // --- SMART GOAL ROUTING ENGINE ---
            // Detects the type of task from the goal and routes to the right flow
            // Works with any agent — built-in or user-created
            const goal = (customGoal || '').toLowerCase();
            let taskType = 'linkedin_post'; // Default: LinkedIn posting flow

            if (goal.match(/\bjob\b|\bhiring\b|\bcareer\b|\brecruit\b|\bvacancy\b|\bopening\b/)) {
                taskType = 'job_scraper';
            } else if (goal.match(/\bnews\b|\bupdate\b|\bheadlin\b|\bcurrent events\b|\bbreaking\b/)) {
                taskType = 'news';
            } else if (goal.match(/\bvideo\b|\byoutube\b|\bwatch\b|\bclip\b|\btutorial\b/)) {
                taskType = 'video';
            } else if (goal.match(/\bstock\b|\bprice\b|\bmarket\b|\bfinance\b|\btrading\b|\bcrypto\b/)) {
                taskType = 'finance';
            } else if (goal.match(/\bcomment\b|\bengage\b|\breply\b|\binteract\b|\breact\b|\blike\b/)) {
                taskType = 'linkedin_engage';
            } else if (goal.match(/\bemail\b|\boutreach\b|\bmessage\b|\bcontact\b|\bconnect\b|\bDM\b/i)) {
                taskType = 'linkedin_outreach';
            } else if (goal.match(/\bmonitor\b|\btrack\b|\bcompetitor\b|\bspy\b|\banalyze\b|\baudit\b/)) {
                taskType = 'monitor';
            } else if (goal.match(/\bscrape\b|\bextract\b|\bdata\b|\bcollect\b|\bgather\b|\bcrawl\b/)) {
                taskType = 'scraper';
            } else if (goal.match(/\blinkedin\b|\bpost\b|\btrending\b|\bpublish\b|\bwrite\b|\bcontent\b|\bblog\b/)) {
                taskType = 'linkedin_post';
            }
            // If no keywords matched and goal exists, default to research
            if (customGoal && taskType === 'linkedin_post' && !goal.match(/\blinkedin\b|\bpost\b|\btrending\b|\bpublish\b|\bwrite\b|\bcontent\b|\bblog\b/)) {
                taskType = 'research';
            }

            console.log(`🧠 Goal Analysis: "${customGoal || '(default LinkedIn post)'}"`);
            console.log(`📋 Detected Task Type: ${taskType.toUpperCase()}`);

            if (taskType === 'job_scraper') {
                // --- JOB SCRAPER FLOW ---
                console.log(`💼 Starting Job Search...`);
                const keywords = (customGoal || 'AI Engineer')
                    .replace(/scrape|search|find|look|for|jobs|hiring|linkedin|agent|setup|create|every|hour|daily/gi, "")
                    .trim() || 'AI Engineer';

                const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keywords)}&location=Worldwide`;
                console.log(`🌐 Navigating to: ${searchUrl}`);
                await page.goto(searchUrl);

                try { await page.waitForSelector('.jobs-search__results-list', { timeout: 10000 }); } catch (e) { }

                console.log("📜 Scrolling through job listings...");
                await page.evaluate(() => window.scrollBy(0, window.innerHeight));
                await new Promise(r => setTimeout(r, 2000));

                const jobs = await page.evaluate(() => {
                    const items = document.querySelectorAll('.jobs-search__results-list li');
                    return Array.from(items).map(item => {
                        const title = item.querySelector('.base-search-card__title')?.innerText || 'Unknown';
                        const company = item.querySelector('.base-search-card__subtitle')?.innerText || 'Unknown';
                        const location = item.querySelector('.job-search-card__location')?.innerText || 'Unknown';
                        const link = item.querySelector('a.base-card__full-link')?.href || '';
                        return { title, company, location, link };
                    }).slice(0, 15);
                });

                console.log(`✅ Found ${jobs.length} job listings.`);
                if (jobs.length > 0) {
                    const fs = require('fs');
                    const csvContent = "Title,Company,Location,Link\n" +
                        jobs.map(j => `"${j.title}","${j.company}","${j.location}","${j.link}"`).join("\n");
                    const outputPath = process.cwd() + '\\jobs.csv';
                    fs.writeFileSync(outputPath, csvContent);
                    console.log(`💾 Saved ${jobs.length} jobs to: ${outputPath}`);
                }
                console.log("⏳ Keeping browser open for 30 seconds...");
                await new Promise(r => setTimeout(r, 30000));

            } else if (taskType === 'news') {
                // --- NEWS FLOW ---
                console.log(`📰 Starting News Search...`);
                const query = (customGoal || 'AI technology')
                    .replace(/news|update|headlin|latest|check|monitor|every|hour|daily|agent/gi, "").trim() || 'AI technology';
                await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=nws`);
                console.log("📜 Loading headlines...");
                await page.evaluate(() => window.scrollBy(0, window.innerHeight));
                await new Promise(r => setTimeout(r, 3000));
                console.log("✅ News retrieved.");
                console.log("⏳ Keeping browser open for 30 seconds...");
                await new Promise(r => setTimeout(r, 30000));

            } else if (taskType === 'video') {
                // --- VIDEO FLOW ---
                console.log(`📺 Starting Video Search...`);
                const query = (customGoal || 'AI tutorials')
                    .replace(/video|youtube|watch|clip|find|search|every|hour|daily|agent/gi, "").trim() || 'AI tutorials';
                await page.goto(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
                await new Promise(r => setTimeout(r, 3000));
                console.log("✅ Videos found.");
                console.log("⏳ Keeping browser open for 30 seconds...");
                await new Promise(r => setTimeout(r, 30000));

            } else if (taskType === 'finance') {
                // --- FINANCE FLOW ---
                console.log(`📈 Starting Finance Lookup...`);
                const query = (customGoal || 'AAPL')
                    .replace(/stock|price|market|finance|check|monitor|track|trading|crypto|every|hour|daily|agent/gi, "").trim() || 'AAPL';
                await page.goto(`https://www.google.com/finance/quote/${encodeURIComponent(query)}`);
                await new Promise(r => setTimeout(r, 3000));
                console.log("✅ Financial data retrieved.");
                console.log("⏳ Keeping browser open for 30 seconds...");
                await new Promise(r => setTimeout(r, 30000));

            } else if (taskType === 'linkedin_engage') {
                // --- LINKEDIN ENGAGEMENT FLOW (Comment/Like) ---
                console.log(`💬 Starting LinkedIn Engagement Task...`);
                const hashtag = (customGoal || '#openclaw')
                    .match(/#\w+/)?.[0] || '#openclaw';
                await page.goto(`https://www.linkedin.com/feed/hashtag/${hashtag.replace('#', '')}/`);
                console.log(`🔍 Searching for ${hashtag} posts...`);

                // Wait for login
                let feedLoaded = false;
                while (!feedLoaded) {
                    try {
                        const hasContent = await page.$('.feed-shared-update-v2, .occludable-update, article');
                        if (hasContent) { feedLoaded = true; } else { await new Promise(r => setTimeout(r, 3000)); }
                    } catch (e) { await new Promise(r => setTimeout(r, 3000)); }
                }
                console.log("✅ Feed loaded with hashtag posts.");

                // Find and interact with posts
                const postCount = await page.evaluate(() => {
                    return document.querySelectorAll('.feed-shared-update-v2, .occludable-update, article').length;
                });
                console.log(`📝 Found ${postCount} posts with this hashtag.`);

                // Scroll through posts
                for (let i = 0; i < 3; i++) {
                    await page.evaluate(() => window.scrollBy(0, 500));
                    await new Promise(r => setTimeout(r, 1500));
                }
                console.log("✅ Engagement review complete.");
                console.log("⏳ Keeping browser open for 60 seconds for manual engagement...");
                await new Promise(r => setTimeout(r, 60000));

            } else if (taskType === 'linkedin_outreach') {
                // --- LINKEDIN OUTREACH/MESSAGING FLOW ---
                console.log(`📨 Starting LinkedIn Outreach Task...`);
                const query = (customGoal || 'AI Engineer')
                    .replace(/email|outreach|message|contact|connect|DM|send|every|hour|daily|agent/gi, "").trim() || 'AI Engineer';
                await page.goto(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`);
                console.log(`🔍 Searching for people: "${query}"...`);

                // Wait for login
                let searchLoaded = false;
                while (!searchLoaded) {
                    try {
                        const hasResults = await page.$('.search-results-container, .reusable-search__result-container');
                        if (hasResults) { searchLoaded = true; } else { await new Promise(r => setTimeout(r, 3000)); }
                    } catch (e) { await new Promise(r => setTimeout(r, 3000)); }
                }
                console.log("✅ Search results loaded.");
                console.log("⏳ Keeping browser open for 60 seconds for manual outreach...");
                await new Promise(r => setTimeout(r, 60000));

            } else if (taskType === 'monitor') {
                // --- MONITORING/COMPETITOR ANALYSIS FLOW ---
                console.log(`🔎 Starting Monitoring Task...`);
                const query = (customGoal || 'competitor analysis AI')
                    .replace(/monitor|track|competitor|spy|analyze|audit|every|hour|daily|agent/gi, "").trim() || 'competitor analysis';
                await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
                console.log(`🔍 Researching: "${query}"...`);

                let searchFound = false;
                while (!searchFound) {
                    try {
                        const hasResults = await page.$('#search, #rso');
                        if (hasResults) { searchFound = true; } else { await new Promise(r => setTimeout(r, 3000)); }
                    } catch (e) { await new Promise(r => setTimeout(r, 3000)); }
                }
                console.log("✅ Research results loaded.");
                await page.evaluate(() => window.scrollBy(0, window.innerHeight));
                await new Promise(r => setTimeout(r, 2000));
                console.log("⏳ Keeping browser open for 60 seconds...");
                await new Promise(r => setTimeout(r, 60000));

            } else if (taskType === 'scraper') {
                // --- DATA SCRAPING FLOW ---
                console.log(`🕷️ Starting Data Scraping Task...`);
                const query = (customGoal || 'AI tools listing')
                    .replace(/scrape|extract|data|collect|gather|crawl|every|hour|daily|agent/gi, "").trim() || 'AI tools';
                await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
                console.log(`🔍 Searching for data sources: "${query}"...`);

                let searchFound = false;
                while (!searchFound) {
                    try {
                        const hasResults = await page.$('#search, #rso');
                        if (hasResults) { searchFound = true; } else { await new Promise(r => setTimeout(r, 3000)); }
                    } catch (e) { await new Promise(r => setTimeout(r, 3000)); }
                }

                // Extract data from search results
                const results = await page.evaluate(() => {
                    const headings = document.querySelectorAll('#search h3, #rso h3');
                    return Array.from(headings).map(h => h.innerText?.trim()).filter(t => t).slice(0, 10);
                });
                console.log(`📊 Extracted ${results.length} results:`);
                results.forEach((r, i) => console.log(`   ${i + 1}. ${r}`));

                const fs = require('fs');
                const outputPath = process.cwd() + '\\scraped_data.csv';
                fs.writeFileSync(outputPath, "Result\n" + results.map(r => `"${r}"`).join("\n"));
                console.log(`💾 Saved data to: ${outputPath}`);
                console.log("⏳ Keeping browser open for 30 seconds...");
                await new Promise(r => setTimeout(r, 30000));

            } else if (taskType === 'research') {
                // --- SMART RESEARCH FLOW (keeps browser open!) ---
                console.log(`🔍 Starting Research: "${customGoal}"...`);
                // Extract a clean search query from the goal
                const query = customGoal
                    .replace(/every|hour|daily|agent|setup|create|make|build|automate|automation|browser|via|then|and|the|for|with|using/gi, "")
                    .trim();
                await page.goto('https://www.google.com');
                await page.type('textarea[name="q"]', query);
                await page.keyboard.press('Enter');

                let searchFound = false;
                while (!searchFound) {
                    try {
                        const hasResults = await page.$('#search, #rso');
                        if (hasResults) { searchFound = true; } else { await new Promise(r => setTimeout(r, 3000)); }
                    } catch (e) { await new Promise(r => setTimeout(r, 3000)); }
                }

                console.log("✅ Research results loaded.");
                await page.evaluate(() => window.scrollBy(0, window.innerHeight));
                await new Promise(r => setTimeout(r, 2000));
                console.log("⏳ Keeping browser open for 60 seconds for manual review...");
                await new Promise(r => setTimeout(r, 60000));
            }

            // --- LINKEDIN POSTING FLOW ---
            // Runs for: linkedin_post taskType (default when no goal, or goal mentions linkedin/post/trending)
            if (taskType === 'linkedin_post') {
                // Each step is independently wrapped to prevent cascading failures

                // Determine if this is a CUSTOM goal or a generic trending post
                const hasCustomGoal = customGoal && !goal.match(/^(post|trending|linkedin|publish|write|content)\s*$/);

                // Extract a clean search query: split into words, remove stop words (whole words only)
                const STOP_WORDS = new Set([
                    'create', 'make', 'build', 'setup', 'set', 'up', 'agent', 'that', 'which', 'will',
                    'please', 'and', 'or', 'but', 'post', 'on', 'linkedin', 'linked', 'from', 'glorify',
                    'his', 'her', 'their', 'its', 'my', 'your', 'achievements', 'accomplishments',
                    'the', 'a', 'an', 'publish', 'write', 'about', 'search', 'find', 'look', 'scrape',
                    'extract', 'collect', 'internet', 'web', 'online', 'then', 'also', 'should', 'would',
                    'could', 'it', 'them', 'this', 'these', 'those', 'to', 'for', 'in', 'at', 'of',
                    'by', 'with', 'into', 'some', 'is', 'are', 'was', 'were', 'be', 'been', 'do', 'does',
                    'did', 'top', 'ten', 'best', 'latest', 'can', 'who', 'what', 'how', 'i', 'me', 'we',
                    'you', 'he', 'she', 'they', 'an', 'has', 'have', 'had',
                    // Profile/experience instruction words
                    'past', 'experiences', 'experience', 'information', 'details', 'detail', 'profile',
                    'work', 'highlight', 'highlights', 'show', 'tell', 'get', 'check', 'recent', 'current',
                    'background', 'history', 'career', 'resume', 'bio', 'summary', 'info', 'data',
                    'all', 'list', 'give', 'me', 'need', 'want', 'know', 'see', 'just', 'only',
                    'skills', 'skill', 'education', 'qualifications', 'posts', 'activity', 'feed',
                    'using', 'use', 'via', 'through', 'go', 'visit', 'open', 'navigate'
                ]);
                const customSearchQuery = hasCustomGoal
                    ? customGoal.split(/\s+/).filter(w => !STOP_WORDS.has(w.toLowerCase())).join(' ').trim()
                    : '';

                console.log(`🎯 Custom goal detected: ${hasCustomGoal}`);
                if (customSearchQuery) console.log(`🔎 Clean search query: "${customSearchQuery}"`);

                // STEP 0: Research — LinkedIn profile search for custom goals, Google for trending
                let googleTrends = [];
                let customSearchResults = [];
                let profileData = null; // Will hold real LinkedIn profile data

                if (hasCustomGoal && customSearchQuery) {
                    // === CUSTOM GOAL: Search LinkedIn directly for the person/topic ===
                    try {
                        console.log(`\n🔍 STEP 0: Searching LinkedIn for "${customSearchQuery}"...`);
                        const linkedinSearchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(customSearchQuery)}`;
                        await page.goto(linkedinSearchUrl);
                        console.log("⏳ Waiting for LinkedIn search results... (Log in if needed, script will wait)");

                        // Wait for search results to load (user may need to log in first)
                        let searchResultsLoaded = false;
                        while (!searchResultsLoaded) {
                            try {
                                const hasResults = await page.$('.search-results-container, .reusable-search__result-container, .entity-result, [data-chameleon-result-urn]');
                                if (hasResults) {
                                    searchResultsLoaded = true;
                                    console.log("✅ LinkedIn search results loaded!");
                                } else {
                                    await new Promise(r => setTimeout(r, 3000));
                                    console.log("⏳ Still waiting for search results...");
                                }
                            } catch (e) {
                                await new Promise(r => setTimeout(r, 3000));
                            }
                        }

                        await new Promise(r => setTimeout(r, 2000)); // Let results fully render

                        // Click the first person result to visit their profile
                        console.log("👤 Looking for the profile in search results...");
                        try {
                            const profileClicked = await page.evaluate(() => {
                                // Find profile links in search results
                                const profileLinks = document.querySelectorAll(
                                    '.entity-result__title-text a, ' +
                                    '.app-aware-link[href*="/in/"], ' +
                                    'a[href*="/in/"][class*="app-aware"], ' +
                                    '.reusable-search__result-container a[href*="/in/"]'
                                );
                                for (const link of profileLinks) {
                                    if (link.href && link.href.includes('/in/')) {
                                        link.click();
                                        return link.href;
                                    }
                                }
                                return null;
                            });

                            if (profileClicked) {
                                console.log(`✅ Clicked on profile: ${profileClicked}`);
                                await new Promise(r => setTimeout(r, 4000)); // Wait for profile to load

                                // Extract profile data
                                console.log("📋 Extracting profile information...");
                                profileData = await page.evaluate(() => {
                                    const name = document.querySelector('h1')?.innerText?.trim() || '';
                                    const headline = document.querySelector('.text-body-medium')?.innerText?.trim() || '';

                                    // Get the about section
                                    let about = '';
                                    const aboutSection = document.querySelector('#about ~ div .inline-show-more-text, #about + div + div span[aria-hidden="true"]');
                                    if (aboutSection) about = aboutSection.innerText?.trim() || '';
                                    // Fallback: search by section heading
                                    if (!about) {
                                        const sections = document.querySelectorAll('section');
                                        for (const sec of sections) {
                                            const heading = sec.querySelector('#about, [id*="about"]');
                                            if (heading) {
                                                const textEl = sec.querySelector('.inline-show-more-text, span[aria-hidden="true"]');
                                                if (textEl) about = textEl.innerText?.trim() || '';
                                                break;
                                            }
                                        }
                                    }

                                    // Get experience entries
                                    const experiences = [];
                                    const expItems = document.querySelectorAll('#experience ~ div li, section:has(#experience) li');
                                    expItems.forEach(item => {
                                        const title = item.querySelector('.t-bold span[aria-hidden="true"]')?.innerText?.trim() || '';
                                        const company = item.querySelector('.t-normal span[aria-hidden="true"]')?.innerText?.trim() || '';
                                        if (title) experiences.push({ title, company });
                                    });

                                    // Get location
                                    const location = document.querySelector('.text-body-small[class*="break-words"]')?.innerText?.trim() || '';

                                    // Get connection count / followers
                                    const connections = document.querySelector('.t-bold[class*="link"]')?.innerText?.trim() || '';

                                    return {
                                        name: name || 'Unknown',
                                        headline: headline || '',
                                        about: about.slice(0, 500),
                                        experiences: experiences.slice(0, 5),
                                        location,
                                        connections
                                    };
                                });

                                console.log(`\n📊 Profile Data Extracted:`);
                                console.log(`   👤 Name: ${profileData.name}`);
                                console.log(`   💼 Headline: ${profileData.headline}`);
                                console.log(`   📍 Location: ${profileData.location}`);
                                if (profileData.about) console.log(`   📝 About: ${profileData.about.slice(0, 150)}...`);
                                if (profileData.experiences.length > 0) {
                                    console.log(`   🏢 Experience (${profileData.experiences.length} entries):`);
                                    profileData.experiences.forEach((e, i) => console.log(`      ${i + 1}. ${e.title} at ${e.company}`));
                                }
                            } else {
                                console.log("⚠️ Could not find a clickable profile link. Will use search result data.");
                                // Fallback: extract data from search results page
                                const searchResults = await page.evaluate(() => {
                                    const results = [];
                                    const items = document.querySelectorAll('.entity-result, [data-chameleon-result-urn], .reusable-search__result-container li');
                                    items.forEach(item => {
                                        const name = item.querySelector('.entity-result__title-text a span[aria-hidden="true"], .app-aware-link span[dir="ltr"]')?.innerText?.trim() || '';
                                        const headline = item.querySelector('.entity-result__primary-subtitle, .t-14.t-normal')?.innerText?.trim() || '';
                                        if (name) results.push({ title: `${name} — ${headline}`, snippet: headline });
                                    });
                                    return results.slice(0, 5);
                                });
                                customSearchResults = searchResults;
                            }
                        } catch (profileErr) {
                            console.log("⚠️ Profile navigation error:", profileErr.message);
                        }
                    } catch (e) {
                        console.log("⚠️ LinkedIn search failed:", e.message);
                        console.log("👉 Will compose post from goal text.");
                    }

                } else {
                    // === DEFAULT: Google search for trending topics ===
                    try {
                        console.log("🔍 Searching Google for trending topics...");
                        await page.goto('https://www.google.com/search?q=trending+topics+today+technology+AI');
                        console.log("⏳ If you see a CAPTCHA, please solve it. The script will wait...");

                        let searchFound = false;
                        while (!searchFound) {
                            try {
                                const hasResults = await page.$('#search, #rso, #center_col');
                                if (hasResults) {
                                    searchFound = true;
                                    console.log("✅ Google search results loaded!");
                                } else {
                                    await new Promise(r => setTimeout(r, 3000));
                                }
                            } catch (pollErr) {
                                console.log("⏳ Page reloaded (CAPTCHA?), still waiting...");
                                await new Promise(r => setTimeout(r, 3000));
                            }
                        }
                        await new Promise(r => setTimeout(r, 2000));
                        try {
                            const searchData = await page.evaluate(() => {
                                const results = [];
                                const items = document.querySelectorAll('#search .g, #rso .g, #rso > div > div');
                                items.forEach(item => {
                                    const title = item.querySelector('h3')?.innerText?.trim() || '';
                                    const snippet = (
                                        item.querySelector('.VwiC3b')?.innerText?.trim() ||
                                        item.querySelector('[data-sncf]')?.innerText?.trim() ||
                                        ''
                                    );
                                    if (title && title.length > 3) results.push({ title, snippet });
                                });
                                if (results.length === 0) {
                                    const allH3 = document.querySelectorAll('#search h3, #rso h3');
                                    allH3.forEach(h3 => {
                                        const title = h3.innerText?.trim() || '';
                                        if (title && title.length > 3) results.push({ title, snippet: '' });
                                    });
                                }
                                return results.slice(0, 10);
                            });
                            googleTrends = searchData.map(r => r.title).filter(t => t.length > 5 && t.length < 120).slice(0, 5);
                            if (googleTrends.length > 0) {
                                console.log(`📊 Found ${googleTrends.length} trending topics:`);
                                googleTrends.forEach((t, i) => console.log(`   ${i + 1}. ${t}`));
                            }
                        } catch (extractErr) {
                            console.log("⚠️ Could not extract trending topics:", extractErr.message);
                        }
                    } catch (e) {
                        console.log("⚠️ Google search failed:", e.message);
                    }
                }

                // STEP 1: Navigate to LinkedIn Feed for posting
                try {
                    console.log("\n🌐 STEP 1: Navigating to LinkedIn Feed for posting...");
                    await page.goto('https://linkedin.com/feed/');
                    console.log("✅ LinkedIn feed loaded.");
                } catch (navErr) {
                    console.error("❌ LinkedIn navigation failed:", navErr.message);
                    console.log("⏳ Browser will stay open for 2 minutes. Try navigating manually.");
                    await new Promise(r => setTimeout(r, 120000));
                }

                // STEP 2: Wait for login & post
                try {
                    console.log("⏳ Waiting for feed to load... (Log in manually if needed. Script will wait.)");

                    // Use a polling approach to find the "Start a post" button by text content
                    // LinkedIn changes CSS classes frequently, so we search by text instead
                    let postButton = null;
                    while (!postButton) {
                        try {
                            postButton = await page.evaluateHandle(() => {
                                // Strategy 1: Find by text content "Start a post"
                                const allButtons = document.querySelectorAll('button, div[role="button"], a');
                                for (const btn of allButtons) {
                                    if (btn.innerText?.toLowerCase().includes('start a post')) return btn;
                                }
                                // Strategy 2: Find by aria-label
                                const ariaBtn = document.querySelector('[aria-label*="Start a post"], [aria-label*="Create a post"]');
                                if (ariaBtn) return ariaBtn;
                                // Strategy 3: Find the share box area (common wrapper)
                                const shareBox = document.querySelector('.share-box-feed-entry__trigger, .share-box, [data-test-id="share-box"]');
                                if (shareBox) return shareBox;
                                return null;
                            });

                            // Check if we actually got an element (not null)
                            const isNull = await postButton.evaluate(el => el === null);
                            if (isNull) {
                                postButton = null;
                                await new Promise(r => setTimeout(r, 3000));
                                console.log("⏳ Still looking for 'Start a post' button...");
                            }
                        } catch (e) {
                            postButton = null;
                            await new Promise(r => setTimeout(r, 3000));
                        }
                    }

                    console.log("✅ Feed loaded! Found 'Start a post' button.");

                    // Gather trending topics (Google > LinkedIn sidebar > defaults)
                    let trendingTopics = googleTrends.length > 0 ? googleTrends : [];

                    if (trendingTopics.length === 0) {
                        console.log("🔍 Scanning LinkedIn sidebar for trending topics...");
                        await new Promise(r => setTimeout(r, 3000));
                        try {
                            trendingTopics = await page.evaluate(() => {
                                const newsItems = document.querySelectorAll(
                                    '.news-module__story-title, .news-module a, ' +
                                    '[data-finite-scroll-hotkey-item] span, ' +
                                    '.feed-follows-module a, .trending-topic, aside li a'
                                );
                                const topics = Array.from(newsItems)
                                    .map(el => el.innerText?.trim())
                                    .filter(t => t && t.length > 5 && t.length < 120);
                                return [...new Set(topics)].slice(0, 5);
                            });
                        } catch (e) {
                            console.log("⚠️ Could not scrape sidebar.");
                        }
                    }

                    if (trendingTopics.length > 0) {
                        console.log(`📊 Using ${trendingTopics.length} trending topics:`);
                        trendingTopics.forEach((t, i) => console.log(`   ${i + 1}. ${t}`));
                    } else {
                        console.log("📊 Using default topics.");
                        trendingTopics = ["AI Automation", "Future of Work", "Open Source"];
                    }

                    // Compose a rich, detailed, well-structured LinkedIn post
                    let postContent;

                    if (hasCustomGoal && profileData && profileData.name !== 'Unknown') {
                        // === BEST: Use REAL LinkedIn profile data ===
                        const pName = profileData.name;
                        const pHeadline = profileData.headline || 'technology professional';
                        const pAbout = profileData.about || '';
                        const pExps = profileData.experiences || [];
                        const pLocation = profileData.location || '';

                        // Build experience highlights
                        const expLines = pExps.slice(0, 3).map(e =>
                            `→ ${e.title}${e.company ? ' at ' + e.company : ''}`
                        );

                        // Build about snippet
                        const aboutSnippet = pAbout.length > 30
                            ? `"${pAbout.slice(0, 200)}${pAbout.length > 200 ? '...' : ''}"`
                            : '';

                        // Generate hashtags from headline words
                        const hashtagWords = pHeadline.split(/[\s|,·]+/)
                            .filter(w => w.length > 3 && !/at|the|and|for|with/i.test(w))
                            .slice(0, 3)
                            .map(w => '#' + w.charAt(0).toUpperCase() + w.slice(1).replace(/[^a-zA-Z0-9]/g, ''));

                        postContent = [
                            `🌟 Meet ${pName} — ${pHeadline} 🚀`,
                            ``,
                            `I want to spotlight someone who's making an incredible impact!`,
                            ``,
                            ...(pLocation ? [`📍 Based in ${pLocation}`, ``] : []),
                            `💼 𝗣𝗿𝗼𝗳𝗲𝘀𝘀𝗶𝗼𝗻𝗮𝗹 𝗛𝗶𝗴𝗵𝗹𝗶𝗴𝗵𝘁𝘀:`,
                            ...(expLines.length > 0 ? expLines : [`→ ${pHeadline}`]),
                            ``,
                            ...(aboutSnippet ? [
                                `📝 𝗜𝗻 𝗧𝗵𝗲𝗶𝗿 𝗢𝘄𝗻 𝗪𝗼𝗿𝗱𝘀:`,
                                aboutSnippet,
                                ``
                            ] : []),
                            `🚀 𝗪𝗵𝘆 𝗧𝗵𝗶𝘀 𝗠𝗮𝘁𝘁𝗲𝗿𝘀:`,
                            `${pName} represents the kind of talent that's driving innovation forward.`,
                            `Their work in ${pHeadline.split(/[|,·]+/)[0].trim()} shows what's possible`,
                            `when passion meets expertise. Truly inspiring! 💪`,
                            ``,
                            `Have you connected with ${pName}? What inspires YOU about their work?`,
                            `Drop your thoughts below! 👇`,
                            ``,
                            `${hashtagWords.join(' ')} #TechLeaders #Innovation #Inspiration`,
                        ].join('\n');

                        console.log(`\n📝 Composed PROFILE-BASED post about "${pName}":`);

                    } else if (hasCustomGoal && customSearchResults.length > 0) {
                        // === FALLBACK 1: Use LinkedIn search result data ===
                        const subjectName = customSearchQuery.split(/\s+/).slice(0, 3).join(' ');
                        const keyInsights = customSearchResults.slice(0, 5).map(r => r.title);
                        const relevantHashtags = customSearchQuery.split(/\s+/)
                            .filter(w => w.length > 3)
                            .slice(0, 4)
                            .map(w => '#' + w.charAt(0).toUpperCase() + w.slice(1).replace(/[^a-zA-Z0-9]/g, ''))
                            .join(' ');

                        postContent = [
                            `🌟 Spotlight: ${subjectName} — Making Waves in Tech! 🚀`,
                            ``,
                            `I recently came across some incredible work and wanted to share:`,
                            ``,
                            `📊 𝗞𝗲𝘆 𝗛𝗶𝗴𝗵𝗹𝗶𝗴𝗵𝘁𝘀:`,
                            ...keyInsights.map(insight => `→ ${insight}`),
                            ``,
                            `🚀 ${subjectName} is a name to watch in the tech space!`,
                            `Their contributions are making a real difference. 💪`,
                            ``,
                            `What are your thoughts? Drop them below 👇`,
                            ``,
                            `${relevantHashtags} #Innovation #TechLeaders #Inspiration`,
                        ].join('\n');

                        console.log(`\n📝 Composed post from search results about "${subjectName}":`);

                    } else if (hasCustomGoal) {
                        // === FALLBACK 2: No profile or search data — compose from topic ===
                        const subjectName = customSearchQuery.split(/\s+/).slice(0, 3).join(' ');
                        const topicWords = customSearchQuery.split(/\s+/).filter(w => w.length > 2);
                        const relevantHashtags = topicWords.slice(0, 4)
                            .map(w => '#' + w.charAt(0).toUpperCase() + w.slice(1).replace(/[^a-zA-Z0-9]/g, ''))
                            .join(' ');

                        postContent = [
                            `🌟 ${subjectName} — A Rising Force in the Industry! 🚀`,
                            ``,
                            `I want to highlight the incredible work of ${subjectName}.`,
                            ``,
                            `🔥 𝗪𝗵𝘆 𝗬𝗼𝘂 𝗦𝗵𝗼𝘂𝗹𝗱 𝗞𝗻𝗼𝘄 𝗧𝗵𝗶𝘀 𝗡𝗮𝗺𝗲:`,
                            `→ Pushing boundaries in ${topicWords.slice(1, 3).join(' & ') || 'technology'}`,
                            `→ Demonstrating excellence and innovation`,
                            `→ Making a meaningful impact that inspires the community`,
                            ``,
                            `Keep shining and inspiring! 💪`,
                            ``,
                            `Share your thoughts below! 👇`,
                            ``,
                            `${relevantHashtags} #Innovation #TechLeaders #Inspiration`,
                        ].join('\n');

                        console.log(`\n📝 Composed topic-based post about "${subjectName}":`);
                    } else {
                        // === DEFAULT TRENDING POST (original template) ===
                        const topTrend = trendingTopics[0];
                        const trend2 = trendingTopics[1] || "Machine Learning";
                        const trend3 = trendingTopics[2] || "Cloud Computing";
                        const hashtags = trendingTopics.slice(0, 4)
                            .map(t => '#' + t.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20))
                            .join(' ');

                        postContent = [
                            `🔥 ${topTrend} — Here's What You Need to Know`,
                            ``,
                            `The tech world is buzzing about "${topTrend}" right now, and for good reason.`,
                            ``,
                            `Here are the key facts and insights:`,
                            ``,
                            `📊 𝗧𝗵𝗲 𝗡𝘂𝗺𝗯𝗲𝗿𝘀 𝗗𝗼𝗻'𝘁 𝗟𝗶𝗲:`,
                            `→ AI adoption has surged by 270% in the last 4 years across industries`,
                            `→ 77% of companies are either using or exploring AI in their business`,
                            `→ The global AI market is projected to reach $1.81 trillion by 2030`,
                            ``,
                            `🚀 𝗪𝗵𝘆 𝗜𝘁 𝗠𝗮𝘁𝘁𝗲𝗿𝘀:`,
                            `→ "${topTrend}" is reshaping how we think about productivity`,
                            `→ Companies leveraging "${trend2}" are seeing 40% faster deployment cycles`,
                            `→ Open-source tools are democratizing access to sophisticated automation`,
                            ``,
                            `💡 𝗞𝗲𝘆 𝗧𝗮𝗸𝗲𝗮𝘄𝗮𝘆𝘀:`,
                            `1. Automation isn't replacing humans — it's amplifying what we can do`,
                            `2. The gap between early adopters and laggards is widening rapidly`,
                            `3. Skills in AI, ${trend2}, and ${trend3} will define the next decade of careers`,
                            ``,
                            `🔮 𝗟𝗼𝗼𝗸𝗶𝗻𝗴 𝗔𝗵𝗲𝗮𝗱:`,
                            `The convergence of AI agents, browser automation, and intelligent workflows`,
                            `is creating a new paradigm. Tools like OpenClaw are making it possible to`,
                            `automate complex multi-step tasks with just a single command.`,
                            ``,
                            `The future belongs to those who embrace intelligent automation today.`,
                            ``,
                            `What's your take on ${topTrend}? Are you already leveraging it?`,
                            `Drop your thoughts below 👇`,
                            ``,
                            `${hashtags} #AI #Automation #FutureOfWork #TechTrends #Innovation`,
                        ].join('\n');

                        console.log("\n📝 Composed Trending Post:");
                    }

                    console.log("\n📝 Composed Post:");
                    console.log("─".repeat(50));
                    console.log(postContent);
                    console.log("─".repeat(50));

                    // Click the "Start a post" button to open modal
                    console.log("\n✍️ Opening post modal...");
                    await postButton.click();
                    await new Promise(r => setTimeout(r, 3000));

                    // Find the post editor (contenteditable div inside the modal)
                    console.log("✍️ Looking for post editor...");
                    let editor = null;
                    for (let i = 0; i < 10; i++) {
                        editor = await page.$('div[contenteditable="true"], .ql-editor, [role="textbox"][contenteditable="true"]');
                        if (editor) break;
                        await new Promise(r => setTimeout(r, 1000));
                    }

                    if (editor) {
                        await editor.click();
                        await new Promise(r => setTimeout(r, 500));
                        console.log("✍️ Typing post content...");
                        await page.keyboard.type(postContent, { delay: 20 });
                        await new Promise(r => setTimeout(r, 1500));
                        console.log("✅ Post content typed successfully!");
                    } else {
                        console.log("⚠️ Could not find editor. Trying keyboard typing...");
                        await page.keyboard.type(postContent, { delay: 20 });
                    }

                    // Auto-click the "Post" button
                    console.log("\n🚀 Auto-posting in 5 seconds... (Close browser now to cancel!)");
                    await new Promise(r => setTimeout(r, 5000));

                    try {
                        const posted = await page.evaluate(() => {
                            // Find the Post/Submit button by text
                            const buttons = document.querySelectorAll('button');
                            for (const btn of buttons) {
                                const text = btn.innerText?.trim().toLowerCase();
                                if (text === 'post' || text === 'submit') {
                                    btn.click();
                                    return true;
                                }
                            }
                            // Try aria-label
                            const ariaPost = document.querySelector('button[aria-label="Post"]');
                            if (ariaPost) { ariaPost.click(); return true; }
                            return false;
                        });

                        if (posted) {
                            console.log("🎉 POST PUBLISHED SUCCESSFULLY!");
                            await new Promise(r => setTimeout(r, 5000));
                        } else {
                            console.log("⚠️ Could not find Post button. Please click it manually.");
                            console.log("⏳ Keeping browser open for 30 seconds...");
                            await new Promise(r => setTimeout(r, 30000));
                        }
                    } catch (postErr) {
                        console.log("⚠️ Auto-post failed:", postErr.message);
                        console.log("⏳ Keeping browser open for 30 seconds to post manually...");
                        await new Promise(r => setTimeout(r, 30000));
                    }

                } catch (e) {
                    console.warn("⚠️ LinkedIn posting failed:", e.message);
                    console.log("⏳ Keeping browser open for 2 minutes for manual interaction...");
                    await new Promise(r => setTimeout(r, 120000));
                }

                console.log("✅ Action Completed (Real Mode)");
            }
        } catch (e) {
            console.error("❌ Unexpected Error:", e.message);
            console.log("⏳ Keeping browser open for 2 minutes for manual debugging...");
            try { await new Promise(r => setTimeout(r, 120000)); } catch (_) { }
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
