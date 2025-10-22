# 🔑 OpenAI DALL-E 3 Setup Guide

## Step 1: Get Your OpenAI API Key

### 1. Go to OpenAI Platform
Visit: **https://platform.openai.com/api-keys**

### 2. Sign Up or Log In
- If you don't have an account, click "Sign up"
- If you have an account, click "Log in"

### 3. Create API Key
1. Click the **"+ Create new secret key"** button
2. Give it a name (e.g., "Flashcard App")
3. Click **"Create secret key"**
4. **⚠️ IMPORTANT:** Copy the key immediately! You won't be able to see it again
   - It will look like: `sk-proj-abc123...xyz789`

### 4. Add Payment Method (Required for DALL-E 3)
1. Go to: **https://platform.openai.com/settings/organization/billing/overview**
2. Click **"Add payment method"**
3. Add your credit card

**💰 Pricing:**
- DALL-E 3 Standard: **$0.040 per image** (1024×1024)
- DALL-E 3 HD: **$0.080 per image** (higher quality)
- The app uses "standard" quality by default

**Example costs:**
- 10 cards = $0.40
- 50 cards = $2.00
- 100 cards = $4.00

---

## Step 2: Add API Key to Your Project

### 1. Find Your `.env` File
In your project root: `C:\Users\Test1\Desktop\flsh\.env`

### 2. Add OpenAI API Key
Open `.env` and add this line:

```env
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-your-actual-key-here
```

**Your `.env` file should now look like this:**
```env
EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-key-here
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-your-openai-key-here
```

### 3. Restart Your App
```bash
# Stop the current server (Ctrl+C)
# Then restart
npm start
```

---

## Step 3: Test Image Generation

### Quick Test
1. Add a new card with:
   - Front: "dog"
   - Back: "a domesticated animal"
   - Sample: "The dog barked loudly at the mailman."

2. Check the console - you should see:
   ```
   🎨 Generating image with DALL-E 3 for prompt: ...
   ✅ DALL-E 3 image generated, downloading...
   ✅ Image downloaded and converted to base64
   ```

3. Study the card - flip it to see the beautiful DALL-E 3 image!

---

## 🎨 DALL-E 3 Features

### Quality Settings (in code)

**Current Settings:**
```javascript
{
  model: "dall-e-3",
  size: "1024x1024",    // Square images
  quality: "standard",   // Standard quality ($0.04/image)
  style: "natural"       // Natural style (vs "vivid")
}
```

**Available Options:**

**Size:**
- `1024x1024` - Square (current)
- `1792x1024` - Landscape
- `1024x1792` - Portrait

**Quality:**
- `standard` - Good quality, cheaper ($0.04)
- `hd` - Best quality, more expensive ($0.08)

**Style:**
- `natural` - More realistic (current)
- `vivid` - More vibrant and artistic

### Change Settings
To change settings, edit `src/utils/gemini.js`:

```javascript
const response = await openai.images.generate({
  model: "dall-e-3",
  size: "1024x1024",     // Change this
  quality: "hd",         // Or this
  style: "vivid"         // Or this
});
```

---

## 💡 Tips

### 1. Monitor Usage
Check your usage at: **https://platform.openai.com/usage**

### 2. Set Spending Limits
Go to: **https://platform.openai.com/settings/organization/limits**
- Set a monthly budget (e.g., $10/month)
- Get email alerts

### 3. Better Prompts = Better Images
The app already optimizes prompts using Gemini, but you can improve by:
- Writing clear, descriptive sample sentences
- Including visual details (colors, settings, actions)

### 4. Batch Generation
Generate images for multiple cards at once using the "Generate Images" button
- The app adds 1-second delays between requests to avoid rate limits

---

## 🐛 Troubleshooting

### Error: "API key not found"
**Solution:** 
- Make sure you added `EXPO_PUBLIC_OPENAI_API_KEY` to `.env`
- Restart your app after adding the key

### Error: "Invalid API key"
**Solution:**
- Double-check the key in your `.env` file
- Make sure it starts with `sk-proj-` or `sk-`
- No extra spaces before or after the key

### Error: "Rate limit exceeded"
**Solution:**
- You're generating images too quickly
- Wait 1 minute and try again
- The app already has built-in delays for batch generation

### Error: "CORS policy" or "Failed to fetch"
**Solution:**
- This has been fixed! The app now uses `response_format: "b64_json"`
- This returns images directly as base64 (no URL download needed)
- If you still see this, make sure you have the latest code

### Error: "Billing account required"
**Solution:**
- DALL-E 3 requires a payment method
- Add your credit card at: https://platform.openai.com/settings/organization/billing

### Error: "Insufficient credits"
**Solution:**
- Your OpenAI account is out of credits
- Add more funds or add a payment method

---

## 🆚 DALL-E 3 vs Pollinations.ai

| Feature | DALL-E 3 | Pollinations.ai (previous) |
|---------|----------|---------------------------|
| **Quality** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐ Good |
| **Cost** | $0.04 per image | Free |
| **API Key** | Required | Not required |
| **Speed** | 3-5 seconds | 2-4 seconds |
| **Reliability** | Very high | High |
| **Detail** | Exceptional | Moderate |
| **Accuracy** | Very accurate | Fairly accurate |
| **Style Control** | Yes (natural/vivid) | Limited |

---

## 🔄 Switch Back to Free (Pollinations.ai)

If you want to switch back to the free option, edit `src/utils/gemini.js`:

1. Comment out the DALL-E 3 function
2. Uncomment the Pollinations.ai function
3. Change the export name

Or let me know and I'll do it for you!

---

## 📊 Cost Management

### Estimate Your Costs

**For a typical deck:**
- 20 cards with sample sentences = **$0.80**
- 50 cards with sample sentences = **$2.00**
- 100 cards with sample sentences = **$4.00**

**Monthly usage estimate:**
- Add 10 new cards per day = **$12/month**
- Add 5 new cards per day = **$6/month**

**Pro tip:** Only add sample sentences to cards where a visual would really help!

---

## ✅ You're All Set!

Once you've added your OpenAI API key to `.env` and restarted your app, you'll get beautiful, high-quality DALL-E 3 images on your flashcards!

The images will be:
- 📐 1024×1024 pixels (perfect size)
- 🎨 High quality illustrations
- 🎯 Accurate to your sample sentences
- 💾 Stored permanently in your database
- 📱 Work offline after generation

**Happy studying with beautiful AI images! 🎉**

