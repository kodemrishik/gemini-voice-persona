<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1HiUznhOJvJtYmbeHahdR3zOJtKA3ugNl

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Vercel

To deploy this application to Vercel, follow these steps:

1.  Push your code to a Git repository (GitHub, GitLab, or Bitbucket).
2.  Import the project into Vercel.
3.  In the configuration step, ensure the **Framework Preset** is set to **Vite**.
4.  Add the environment variable `API_KEY` with your Google Gemini API key.
5.  Click **Deploy**.

The `vercel.json` file included in this project handles the routing configuration for the Single Page Application.
