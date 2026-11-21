# Deploy the LandslideGuard frontend on Render

1. Sign in to [Render](https://dashboard.render.com/) and choose **New → Web Service**.
2. Connect GitHub and grant Render access to the private [landslideguard-frontend repository](https://github.com/shushiecodess/landslideguard-frontend). Select its `main` branch.
3. Choose **Node** and leave **Root Directory** empty. The frontend is at the repository root.
4. Use these commands.

   | Render setting | Value |
   | --- | --- |
   | Build Command | `npm ci --include=dev && npm run build -- --webpack` |
   | Start Command | `npm start -- --hostname 0.0.0.0` |
   | Health Check Path | `/` |

5. Under **Environment Variables**, set `NODE_VERSION` to `24.18.1` and `API_BACKEND_URL` to the public HTTPS origin of the VPS API, such as `https://api.example.com`. Enter the origin without `/api`. This value is read during the frontend build.
6. Choose an instance plan and click **Deploy Web Service**. Wait for the deploy to go live, then open the URL Render gives you.
7. At the Render URL, open `/api/health`. A healthy response verifies the connection to the VPS. Sign in with the VPS administrator account to open the dashboard.
8. For the demo, open `/voice-alerts` on the phones and tap **Enable sound**. Leave each page open. On the signed-in admin's **Voice Alerts** tab, choose a language and click **Send demo voice alert**.

The app uses a Render Web Service because Next.js forwards API requests to the VPS. See [Render's Next.js guide](https://render.com/docs/deploy-nextjs-app) and [Render's Web Services settings](https://render.com/docs/web-services).
