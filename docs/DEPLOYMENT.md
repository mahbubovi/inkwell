# Deployment guide

Inkwell deploys to **Vercel** with a **free MongoDB Atlas** database. Vercel serves the React build and runs the Express API as a serverless function (`api/index.js`), so the website and the API share one URL and the login cookie stays first-party. Total time: about 20 minutes. Everything is free.

```
Browser ──> Vercel ──┬─ static React build (client/dist)
                     └─ /api/*  ──>  serverless function (Express)  ──>  MongoDB Atlas
```

## 1. Create the database (MongoDB Atlas)

1. Sign up at mongodb.com/atlas and create a free **M0** cluster. Pick a region close to your users (for South Asia, AWS Singapore `ap-southeast-1`).
2. **Database Access**: add a database user with a username and a simple password (letters and numbers avoid URL-encoding problems).
3. **Network Access**: click **Add IP Address**, then **Allow Access from Anywhere** (`0.0.0.0/0`). Vercel functions use changing IP addresses, so a fixed IP cannot be used.
4. **Connect**, then **Drivers**: copy the connection string and add the database name before the `?`:
   ```
   mongodb+srv://myuser:mypassword@cluster0.abcde.mongodb.net/inkwell?retryWrites=true&w=majority
   ```
   Keep it private. You will paste it into Vercel.

## 2. Put the code on GitHub

The repository root must contain `vercel.json`, `api/`, `client/` and `server/`. Check that `.env` is **not** in the repo. Merge your work into the `main` branch.

## 3. Deploy on Vercel

1. Go to vercel.com and sign in with GitHub.
2. **Add New**, then **Project**, then import your `inkwell` repository.
3. On the configure screen:
   - **Framework Preset**: Other
   - **Root Directory**: leave it as the repository root (`./`)
   - Build and output settings: leave the defaults. They are set by `vercel.json`.
4. Open **Environment Variables** and add these three:

| Name | Value |
|---|---|
| `MONGO_URI` | your Atlas connection string |
| `JWT_SECRET` | a random string of 32 or more characters |
| `NODE_ENV` | `production` |

   To make a secret, run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
5. Click **Deploy** and wait 1 to 2 minutes.

Vercel shows your **live website** URL, for example `https://inkwell-abcd.vercel.app`. Every later push to `main` redeploys automatically, and pull requests get their own preview URL.

**Using the command line instead**
```bash
npm i -g vercel
vercel                      # follow the prompts (preview deploy)
vercel env add MONGO_URI    # repeat for JWT_SECRET and NODE_ENV
vercel --prod               # production deploy
```

## 4. Add sample content (optional)

An empty feed looks bare on a live demo. Seed it from your own computer, pointing at Atlas. In `server/.env` set `MONGO_URI` to the Atlas string, then run (PowerShell):

```powershell
cd server
$env:SEED_PASSWORD = "choose-a-private-password"
npm run seed
```

This creates three sample authors and ten posts. Use a private `SEED_PASSWORD`, because the sample emails are visible in the repository. Afterwards, point your local `.env` back at your local database.

## 5. Verify the live site

- [ ] `https://YOUR-APP.vercel.app/api/health` shows `{"status":"ok","db":"up",...}`
- [ ] The home page loads posts
- [ ] You can register, create a post, and publish it
- [ ] Refreshing the page keeps you logged in
- [ ] Opening `/dashboard` while logged out sends you to the login page
- [ ] The site looks right on your phone

## 6. Add the link everywhere

1. Replace `https://YOUR-APP.onrender.com` in `README.md` with your Vercel URL, commit and push.
2. Put the URL in the repository's **About** box on GitHub (the gear icon).
3. Submit the repo link, the live URL and the LinkedIn post.

## How the Vercel setup works

| File | Role |
|---|---|
| `vercel.json` | Installs both apps, builds the client into `client/dist`, sends `/api/*` to the function, sends every other page to `index.html` (so refreshing `/dashboard` works), and adds security headers |
| `api/index.js` | The serverless function. It loads `server/src/vercel.js` |
| `server/src/vercel.js` | Connects to MongoDB once per warm instance, then hands each request to the Express app |

Things to know about serverless hosting:
- The first request after a quiet period takes 1 to 2 seconds longer (a cold start).
- Rate limits are counted per function instance, not globally.
- After you change an environment variable in Vercel, redeploy for it to take effect.
- For faster API calls from South Asia, create the Atlas cluster in Singapore and set the function region by adding `"regions": ["sin1"]` to `vercel.json`.

## Troubleshooting

| Problem | Fix |
|---|---|
| `/api/health` returns `The server is not configured correctly` | An environment variable is missing or `JWT_SECRET` is shorter than 32 characters. Add or fix it in the project settings, then redeploy |
| `/api/health` returns `Database unavailable` | Check the Atlas username and password, that `/inkwell` is in the string, and that Network Access allows `0.0.0.0/0`. Encode special characters in the password (`@` becomes `%40`) |
| Pages load but every API call is a 404 | `vercel.json` is not at the repository root, or Root Directory is set to `client`. Set it back to the repository root |
| Build fails with `vite: not found` | The install command in `vercel.json` was overridden in the Vercel settings. Clear the override so `vercel.json` is used |
| Logged out after every refresh | Make sure you open the `https://` URL. Check that `NODE_ENV` is `production` |
| `Too many attempts` message | Too many failed logins from one IP. Wait 15 minutes |
| Blank page | Open the browser console (F12) and read the first error |

## Alternative: Render

`render.yaml` deploys the whole app as one always-on Render web service. In Render choose **New**, then **Blueprint**, pick the repository and paste your Atlas string for `MONGO_URI`. The free plan sleeps after 15 minutes without traffic, so the first visit afterwards takes about 50 seconds.
