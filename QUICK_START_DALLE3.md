# ⚡ Quick Start: DALL-E 3 Setup

## 🔑 Step 1: Get OpenAI API Key (2 minutes)

1. Go to: **https://platform.openai.com/api-keys**
2. Click **"+ Create new secret key"**
3. Copy your API key from the OpenAI dashboard

## 💳 Step 2: Add Payment Method (Required)

1. Go to: **https://platform.openai.com/settings/organization/billing/overview**
2. Add credit card
3. **Cost:** $0.04 per image (standard quality)

## 📝 Step 3: Add Key to `.env` File

Open `C:\Users\Test1\Desktop\flsh\.env` and add:

```env
EXPO_PUBLIC_OPENAI_API_KEY=your-openai-api-key
```

## 🔄 Step 4: Restart App

```bash
# Press Ctrl+C to stop
npm start
```

## ✅ Done!

Now add a card with a sample sentence and watch the magic happen! 🎨

---

## 📊 Quick Cost Reference

| Cards | Cost |
|-------|------|
| 1 | $0.04 |
| 10 | $0.40 |
| 25 | $1.00 |
| 50 | $2.00 |
| 100 | $4.00 |

---

## 🆘 Troubleshooting

**"API key not found"**
→ Add key to `.env` and restart

**"Invalid API key"**
→ Double-check the key matches your dashboard

**"Billing account required"**
→ Add credit card at billing page

---

See **OPENAI_SETUP_GUIDE.md** for full details!

