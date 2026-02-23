# Deployment Guide

This Nuxt 4 app uses a traditional server-side approach with optional Firebase for persistence.

## Local Development

```bash
# Install dependencies
npm install

# Create .env with your API keys
cp .env.example .env

# Start dev server (localhost:3000)
npm run dev
```

## Environment Variables

Create a `.env` file:

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project
FIREBASE_APP_ID=...
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

Get Firebase values from: Firebase Console > Project Settings > General tab

## Deploying to Vercel

```bash
vercel
```

Set environment variables in the Vercel dashboard under Project Settings > Environment Variables.

## Deploying to Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Configure environment variables in Railway dashboard.

## Deploying to Other Platforms

The app is a standard Node.js/Nuxt application. Build it with:

```bash
npm run build
```

This creates a `.output` directory ready for deployment to any Node.js host (Render, Fly.io, Heroku, etc.).

## Firestore Security

The app uses Firestore for conversation persistence. Apply security rules:

```bash
firebase login
firebase deploy --only firestore:rules
```

Or manually set rules in Firebase Console > Firestore > Rules tab.
