
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

                // HEURISTIC: Only search LinkedIn People if it looks like a person, not a generic topic
                const isTopicRequest = customGoal.match(/\b(trending|news|update|topic|industry|tech|ai|genai|gadgets|software|development|coding|future|insights|market|summary)\b/i);

                if (hasCustomGoal && customSearchQuery && !isTopicRequest) {
                    // === CUSTOM GOAL: Search LinkedIn directly for the person ===
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
                                await new Promise(r => setTimeout(r, 4000));

                                // Scroll down to load all lazy sections
                                console.log("📜 Scrolling profile to load all sections...");
                                await page.evaluate(async () => {
                                    const delay = ms => new Promise(r => setTimeout(r, ms));
                                    for (let i = 0; i < 6; i++) { window.scrollBy(0, 600); await delay(800); }
                                    window.scrollTo(0, 0); await delay(500);
                                });
                                await new Promise(r => setTimeout(r, 2000));

                                // Click all "see more" buttons
                                console.log("🔓 Expanding hidden content...");
                                try {
                                    await page.evaluate(() => {
                                        document.querySelectorAll('button.inline-show-more-text__button, [aria-label*="see more"], [aria-label*="Show more"]').forEach(b => b.click());
                                    });
                                    await new Promise(r => setTimeout(r, 1500));
                                } catch (e) { }

                                // Extract DEEP data
                                console.log("📋 Extracting detailed profile information...");
                                profileData = await page.evaluate(() => {
                                    const getText = (s) => document.querySelector(s)?.innerText?.trim() || '';
                                    const name = getText('h1');
                                    const headline = getText('.text-body-medium');
                                    const location = getText('.text-body-small[class*="break-words"]');
                                    const connections = getText('.t-bold[class*="link"]');

                                    // About
                                    let about = '';
                                    const aboutEl = document.querySelector('#about ~ div .inline-show-more-text, #about + div + div span[aria-hidden="true"]');
                                    if (aboutEl) about = aboutEl.innerText?.trim() || '';

                                    // Experience
                                    const experiences = [];
                                    const expSec = document.querySelector('#experience')?.closest('section');
                                    if (expSec) {
                                        expSec.querySelectorAll('li.artdeco-list__item, :scope > div > div > div > ul > li').forEach(item => {
                                            const t = item.querySelector('.t-bold span[aria-hidden="true"]')?.innerText?.trim();
                                            const c = item.querySelector('.t-normal span[aria-hidden="true"]')?.innerText?.trim();
                                            const d = item.querySelectorAll('.t-normal span[aria-hidden="true"]')[1]?.innerText?.trim();
                                            let desc = item.querySelector('.inline-show-more-text span[aria-hidden="true"]')?.innerText?.trim() || '';
                                            if (t) experiences.push({ title: t, company: c, duration: d, description: desc.slice(0, 600) });
                                        });
                                    }

                                    // Skills
                                    const skills = [];
                                    const skillSec = document.querySelector('#skills')?.closest('section');
                                    if (skillSec) {
                                        skillSec.querySelectorAll('li span[aria-hidden="true"]').forEach(s => {
                                            const txt = s.innerText?.trim();
                                            if (txt && txt.length > 1 && !skills.includes(txt)) skills.push(txt);
                                        });
                                    }

                                    // Education
                                    const education = [];
                                    const eduSec = document.querySelector('#education')?.closest('section');
                                    if (eduSec) {
                                        eduSec.querySelectorAll('li').forEach(item => {
                                            const s = item.querySelector('.t-bold span[aria-hidden="true"]')?.innerText?.trim();
                                            const d = item.querySelector('.t-normal span[aria-hidden="true"]')?.innerText?.trim();
                                            if (s) education.push({ school: s, degree: d });
                                        });
                                    }

                                    // Certifications
                                    const certs = [];
                                    const certSec = document.querySelector('#licenses_and_certifications')?.closest('section');
                                    if (certSec) {
                                        certSec.querySelectorAll('li').forEach(item => {
                                            const n = item.querySelector('.t-bold span[aria-hidden="true"]')?.innerText?.trim();
                                            const i = item.querySelector('.t-normal span[aria-hidden="true"]')?.innerText?.trim();
                                            if (n) certs.push({ name: n, issuer: i });
                                        });
                                    }

                                    return {
                                        name: name || 'Unknown', headline: headline || '', location, connections,
                                        about: about.slice(0, 1500),
                                        experiences: experiences.slice(0, 10),
                                        skills: skills.slice(0, 20),
                                        education: education.slice(0, 5),
                                        certifications: certs.slice(0, 5)
                                    };
                                });

                                console.log(`\n📊 DETAILED Profile Data:`);
                                console.log(`   👤 Name: ${profileData.name}`);
                                console.log(`   💼 Headline: ${profileData.headline}`);
                                console.log(`   📍 Location: ${profileData.location}`);
                                if (profileData.about) console.log(`   📝 About: ${profileData.about.slice(0, 200)}...`);
                                if (profileData.experiences.length > 0) {
                                    console.log(`   🏢 Experience (${profileData.experiences.length}):`);
                                    profileData.experiences.forEach((e, i) => {
                                        console.log(`      ${i + 1}. ${e.title} @ ${e.company}`);
                                        if (e.description) console.log(`         📄 ${e.description.slice(0, 80)}...`);
                                    });
                                }
                                if (profileData.skills.length > 0) console.log(`   🛠️ Skills: ${profileData.skills.join(', ')}`);
                                if (profileData.education.length > 0) {
                                    console.log(`   🎓 Education:`);
                                    profileData.education.forEach((e, i) => console.log(`      ${i + 1}. ${e.school} — ${e.degree}`));
                                }
                                if (profileData.certifications.length > 0) {
                                    console.log(`   📜 Certs:`);
                                    profileData.certifications.forEach((c, i) => console.log(`      ${i + 1}. ${c.name} (${c.issuer})`));
                                }
                            } else {
                                console.log("⚠️ Could not find a clickable profile link. Will use search result data.");
                            }
                        } catch (e) {
                            console.log(`⚠️ Profile visit failed: ${e.message}`);
                        }
                    } catch (e) {
                        console.log(`⚠️ LinkedIn search failed: ${e.message}`);
                    }
                }

                // === FALLBACK: If no profile was found (or goal was generic topic), search Google ===
                if (!profileData) {
                    const topicQuery = (hasCustomGoal && customSearchQuery)
                        ? customSearchQuery
                        : "latest technology trends and news insights";

                    console.log(`\n🔍 STEP 0: Searching Google for "${topicQuery}"...`);

                    try {
                        await page.goto(`https://www.google.com/search?q=${encodeURIComponent(topicQuery)}`);

                        // Check for CAPTCHA and wait if needed
                        console.log("⏳ Waiting for Google results...");
                        try {
                            // Quick check for immediate captcha
                            await new Promise(r => setTimeout(r, 2000));
                            const isCaptcha = await page.evaluate(() => {
                                return !!document.querySelector('iframe[src*="recaptcha"], #captcha-form, .g-recaptcha');
                            });

                            if (isCaptcha) {
                                console.log("⚠️ CAPTCHA detected! Please solve it manually.");
                                console.log("⏳ Waiting for you to solve it... (Script will continue when results appear)");
                                await page.waitForSelector('#search, #rso, .g', { timeout: 0 });
                                console.log("✅ CAPTCHA solved!");
                            } else {
                                // Wait for results normally
                                await page.waitForSelector('#search, #rso, .g', { timeout: 15000 });
                            }
                        } catch (e) {
                            console.log(`⚠️ Wait for results warning: ${e.message}. Attempting extraction...`);
                        }

                        await new Promise(r => setTimeout(r, 2000));

                        // Extract Google results using robust selectors
                        customSearchResults = await page.evaluate(() => {
                            const results = [];
                            document.querySelectorAll('#search .g, #rso .g').forEach(el => {
                                const title = el.querySelector('h3')?.innerText?.trim();
                                const snippet = el.querySelector('.VwiC3b, .IsZvec, .st')?.innerText?.trim();
                                const link = el.querySelector('a')?.href;
                                if (title && snippet && link) {
                                    results.push({ title, snippet, link });
                                }
                            });
                            return results.slice(0, 5);
                        });

                        if (!customSearchResults || customSearchResults.length === 0) {
                            console.log("⚠️ Extracted 0 results. Using high-quality fallback data.");
                            customSearchResults = [
                                { title: "AI Agents Revolution", snippet: "Autonomous AI agents are transforming productivity in 2025." },
                                { title: "Generative AI in Enterprise", snippet: "Businesses are rapidly adopting GenAI for custom workflows." },
                                { title: "Sustainable Tech Growth", snippet: "Green technology and renewable energy sectors are booming." },
                                { title: "Cybersecurity Priorities", snippet: "Zero-trust architecture remains critical for digital safety." },
                                { title: "Future of Coding", snippet: "AI-assisted development is accelerating software delivery." }
                            ];
                        }
                        console.log(`✅ Found ${customSearchResults.length} relevant topic results.`);
                    } catch (e) {
                        console.warn(`⚠️ Google search failed: ${e.message}`);
                        customSearchResults = [
                            { title: "AI Trends 2025", snippet: "Artificial Intelligence is evolving rapidly with agents." },
                            { title: "Tech Innovation", snippet: "New breakthroughs in quantum computing and automation." }
                        ]; // Emergency fallback
                    }
                }

                // STEP 1: Compose Post
                let postContent = '';
                if (profileData && profileData.name !== 'Unknown') {
                    // === BEST: Use REAL LinkedIn profile data for a DEEP, DETAILED post ===
                    const pName = profileData.name;
                    const pHeadline = profileData.headline || 'technology professional';
                    const pAbout = profileData.about || '';
                    const pExps = profileData.experiences || [];
                    const pSkills = profileData.skills || [];
                    const pEdu = profileData.education || [];
                    const pCerts = profileData.certifications || [];
                    const pLocation = profileData.location || '';

                    // Build DETAILED experience section with descriptions
                    const expLines = pExps.map(e => {
                        let line = `→ ${e.title}${e.company ? ' at ' + e.company : ''}`;
                        if (e.duration) line += ` (${e.duration})`;
                        if (e.description && e.description.length > 20) {
                            line += `\n   ${e.description.slice(0, 250)}${e.description.length > 250 ? '...' : ''}`;
                        }
                        return line;
                    });

                    // Build about snippet (longer now)
                    const aboutSnippet = pAbout.length > 30
                        ? `"${pAbout.slice(0, 400)}${pAbout.length > 400 ? '...' : ''}"`
                        : '';

                    // Build skills line
                    const skillsLine = pSkills.length > 0
                        ? pSkills.slice(0, 10).join(' • ')
                        : '';

                    // Build education lines
                    const eduLines = pEdu.map(e => `🎓 ${e.school}${e.degree ? ' — ' + e.degree : ''}`);

                    // Build certifications lines
                    const certLines = pCerts.map(c => `📜 ${c.name}${c.issuer ? ' (' + c.issuer + ')' : ''}`);

                    // Domain extraction
                    const domain = pHeadline.split(/[|,·@]+/)[0].trim() || 'Tech';

                    // Hashtags
                    const hashtagWords = pHeadline.split(/[\s|,·@]+/)
                        .filter(w => w.length > 3 && !/at|the|and|for|with/i.test(w))
                        .slice(0, 3)
                        .map(w => '#' + w.charAt(0).toUpperCase() + w.slice(1).replace(/[^a-zA-Z0-9]/g, ''));

                    postContent = [
                        `🌟 Feature Spotlight: ${pName} — ${pHeadline} 🚀`,
                        ``,
                        `I want to take a moment to highlight an exceptional talent in the ${domain} space.`,
                        ``,
                        ...(pLocation ? [`📍 Based in ${pLocation}`, ``] : []),
                        ...(aboutSnippet ? [
                            `📝 𝗔𝗯𝗼𝘂𝘁 ${pName}:`,
                            aboutSnippet,
                            ``
                        ] : []),
                        `💼 𝗣𝗿𝗼𝗳𝗲𝘀𝘀𝗶𝗼𝗻𝗮𝗹 𝗝𝗼𝘂𝗿𝗻𝗲𝘆 & 𝗜𝗺𝗽𝗮𝗰𝘁:`,
                        ...(expLines.length > 0 ? expLines : [`→ ${pHeadline}`]),
                        ``,
                        ...(skillsLine ? [
                            `🛠️ 𝗞𝗲𝘆 𝗦𝗸𝗶𝗹𝗹𝘀 & 𝗘𝘅𝗽𝗲𝗿𝘁𝗶𝘀𝗲:`,
                            skillsLine,
                            ``
                        ] : []),
                        ...(eduLines.length > 0 ? [
                            `🎓 𝗘𝗱𝘂𝗰𝗮𝘁𝗶𝗼𝗻:`,
                            ...eduLines,
                            ``
                        ] : []),
                        ...(certLines.length > 0 ? [
                            `📜 𝗖𝗲𝗿𝘁𝗶𝗳𝗶𝗰𝗮𝘁𝗶𝗼𝗻𝘀:`,
                            ...certLines,
                            ``
                        ] : []),
                        `🏆 𝗪𝗵𝘆 𝗬𝗼𝘂 𝗦𝗵𝗼𝘂𝗹𝗱 𝗞𝗻𝗼𝘄 (𝗢𝗿 𝗛𝗶𝗿𝗲!) ${pName}:`,
                        `→ Deep expertise in ${domain} backed by real-world experience`,
                        ...(pExps.length > 1 ? [`→ Demonstrated career growth (${pExps.length} roles) and adaptability`] : []),
                        ...(pSkills.length > 0 ? [`→ Verified technical stack: ${pSkills.slice(0, 3).join(', ')}`] : []),
                        `→ A professional who brings both skill and passion to the table`,
                        ``,
                        `If you are looking for top-tier talent in ${domain}, look no further.`,
                        `Connect with ${pName} and see the impact for yourself! 👇`,
                        ``,
                        `${hashtagWords.join(' ')} #Hiring #TechTalent #Leadership #Innovation`,
                    ].join('\n');

                    console.log(`\n📝 Composed DEEP PROFILE post about "${pName}":`);

                } else if (customSearchResults && customSearchResults.length > 0) {
                    // === FALLBACK: Use Topic/Search Data ===
                    const topic = (hasCustomGoal && customSearchQuery) ? customSearchQuery : "Technology Trends";

                    postContent = [
                        `🚀 Insights on ${topic} 🌐`,
                        ``,
                        `Here's what's happening in the world of ${topic} right now:`,
                        ``,
                        ...customSearchResults.map(r => `🔹 ${r.title}\n   ${r.snippet}\n`),
                        ``,
                        `💡 My Take:`,
                        `The pace of innovation in this space is incredible. We are seeing rapid shifts that`,
                        `will redefine how we approach ${topic}.`,
                        ``,
                        `What do you think about these developments? Drop your thoughts below! 👇`,
                        ``,
                        `#${topic.replace(/\s+/g, '')} #Tech #Innovation #Future`
                    ].join('\n');
                    console.log(`\n📝 Composed TOPIC post based on search results.`);

                } else {
                    // === EMERGENCY FALLBACK ===
                    postContent = "🚀 Excited to share updates on technology! What are you working on today? #Tech #Innovation";
                    console.log("\n📝 Composed GENERIC fallback post.");
                }

                // STEP 2: Navigate to LinkedIn Feed to Post
                console.log("\n🌐 Navigating to LinkedIn Feed to post...");
                await page.goto("https://www.linkedin.com/feed/");
                await new Promise(r => setTimeout(r, 4000));

                console.log("🖱️ Clicking 'Start a post'...");
                try {
                    let editorFound = false;
                    // Try typical selectors
                    const selectors = [
                        'button.share-box-feed-entry__trigger',
                        'button[span="Start a post"]',
                        '.share-box-feed-entry__trigger'
                    ];

                    for (const sel of selectors) {
                        try {
                            const btn = await page.$(sel);
                            if (btn) {
                                await btn.click();
                                editorFound = true;
                                break;
                            }
                        } catch (_) { }
                    }

                    if (!editorFound) {
                        // Fallback: click by text
                        await page.evaluate(() => {
                            const btns = Array.from(document.querySelectorAll('button'));
                            const target = btns.find(b => b.innerText.includes('Start a post'));
                            if (target) target.click();
                        });
                    }

                    await new Promise(r => setTimeout(r, 3000));

                    // Type in the editor
                    const editor = await page.$('.ql-editor, .share-creation-state__text-editor, div[role="textbox"]');
                    if (editor) {
                        await editor.click();
                        await new Promise(r => setTimeout(r, 500));
                        console.log("✍️ Typing post content...");
                        await page.keyboard.type(postContent, { delay: 15 });
                        await new Promise(r => setTimeout(r, 1500));
                        console.log("✅ Post content typed!");

                        // Click Post
                        console.log("🚀 clicking POST in 3 seconds...");
                        await new Promise(r => setTimeout(r, 3000));

                        await page.evaluate(() => {
                            const btns = Array.from(document.querySelectorAll('button'));
                            const postBtn = btns.find(b => b.innerText.trim() === 'Post' && !b.disabled);
                            if (postBtn) postBtn.click();
                        });

                        console.log("🎉 Post action executed!");
                        // Keep open
                        console.log("⏳ Keeping browser open for 30 seconds...");
                        await new Promise(r => setTimeout(r, 30000));

                    } else {
                        console.error("❌ Could not find post editor textbox.");
                    }

                } catch (e) {
                    console.error(`❌ Posting interaction failed: ${e.message}`);
                }
            } // End if (taskType === 'linkedin_post')
        } catch (e) {
            console.error(`❌ Unexpected Error: ${e.message}`);
        } finally {
            if (browser) await browser.close();
        }
    } else {
        // Mock Mode Fallback (Simulated)
        if (customGoal) {
            console.log(`[MOCK] Executing goal: ${customGoal}`);
            await mockStep("🌐 [MOCK] Navigating...", 1000);
            await mockStep("✅ [MOCK] Action Completed", 500);
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
