const { TwitterApi } = require("twitter-api-v2");
const GenAI = require("@google/generative-ai");
const fs = require("fs");

const accounts = JSON.parse(fs.readFileSync("accounts.json", "utf8"));

const generationConfig = { maxOutputTokens: 400 };

// Delay antar akun (dalam milidetik)
const DELAY_BETWEEN_ACCOUNTS = 15 * 60 * 1000; // 15 menit

async function generateTweet(apiKey) {
  const genAI = new GenAI.GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "models/gemini-2.0-flash",
    generationConfig,
  });

  const prompt = "produce crypto meme content, tips and tricks earnings from airdrops, must not be vague and must be unique; under 280 characters and must be plain text, you can use emojis";
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

async function postForAccount(account) {
  const twitterClient = new TwitterApi({
    appKey: account.appKey,
    appSecret: account.appSecret,
    accessToken: account.accessToken,
    accessSecret: account.accessSecret,
  });

  try {
    const tweet = await generateTweet(account.geminiKey);
    await twitterClient.v2.tweet(tweet);
    console.log(`[${account.name}] ✅ Tweet posted:\n${tweet}\n`);
  } catch (error) {
    console.error(`[${account.name}] ❌ Failed:`, error.message);
  }
}

async function mainLoop() {
  while (true) {
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      await postForAccount(account);

      // Tunggu sebelum lanjut ke akun berikutnya
      if (i < accounts.length - 1) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_ACCOUNTS / 60000} minutes...`);
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_ACCOUNTS));
      }
    }

    // Selesai semua akun, tunggu 6 jam untuk ulang
    console.log("🕒 All accounts posted. Sleeping for 6 hours...");
    await new Promise((resolve) => setTimeout(resolve, 6 * 60 * 60 * 1000));
  }
}

mainLoop();
