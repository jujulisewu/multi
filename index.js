const { TwitterApi } = require("twitter-api-v2");
const GenAI = require("@google/generative-ai");
const fs = require("fs");

// CONFIGURATIONS
const accounts = JSON.parse(fs.readFileSync("accounts.json", "utf8"));
const DELAY_BETWEEN_ACCOUNTS = 15 * 60 * 1000; // 58 menit
const WAIT_BETWEEN_CYCLES = 6 * 60 * 60 * 1000; // 6 jam
const WOEID = 23424846; // Indonesia

// ðŸ” Get trending topics
async function getTrendingKeywords(twitterClient) {
  try {
    const trends = await twitterClient.v1.trendsByPlace(WOEID);
    const trendNames = trends[0].trends
      .filter((t) => t.name && !t.name.startsWith("#"))
      .slice(0, 5)
      .map((t) => t.name);
    return trendNames;
  } catch (e) {
    console.error("âŒ Error fetching trends:", e.message);
    return ["Diogo Jota", "Football", "joke", "like for follow", "followers"]; // fallback
  }
}

// ðŸ§  Generate tweet content using Gemini
async function generateTweet(apiKey, trends) {
  const genAI = new GenAI.GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "models/gemini-2.0-flash",
    generationConfig: { maxOutputTokens: 400 },
  });

  const prompt = `Make a short tweet under 280 characters about the following trending topics: ${trends.join(
    ", "
  )}. Make it creative, useful, and plain text. Add emojis if useful.`;
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}

// ðŸ¦ Post a tweet
async function postForAccount(account) {
  const twitterClient = new TwitterApi({
    appKey: account.appKey,
    appSecret: account.appSecret,
    accessToken: account.accessToken,
    accessSecret: account.accessSecret,
  });

  const trends = await getTrendingKeywords(twitterClient);
  const tweet = await generateTweet(account.geminiKey, trends);

  try {
    await twitterClient.v2.tweet(tweet);
    console.log(`[${account.name}] âœ… Tweet posted: ${tweet}`);
  } catch (error) {
    console.error(`[${account.name}] âŒ Failed to post: ${error.message}`);
  }
}

// ðŸ” Loop semua akun
async function mainLoop() {
  while (true) {
    for (let i = 0; i < accounts.length; i++) {
      await postForAccount(accounts[i]);

      // Delay antar akun
      if (i < accounts.length - 1) {
        console.log(`â³ Wait ${DELAY_BETWEEN_ACCOUNTS / 60000} minutes...`);
        await new Promise((res) =>
          setTimeout(res, DELAY_BETWEEN_ACCOUNTS)
        );
      }
    }

    console.log(`ðŸ•“ Done all accounts. Wait ${WAIT_BETWEEN_CYCLES / 3600000} hours...`);
    await new Promise((res) => setTimeout(res, WAIT_BETWEEN_CYCLES));
  }
}

mainLoop();
