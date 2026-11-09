# Inkwell: a React blog app with a Node.js + Express API

A responsive blog application. The frontend is built with React, React Router and Tailwind CSS (Vite). It talks to a REST API built with Node.js, Express and MongoDB.

## Features
- Register and log in with JWT authentication and bcrypt password hashing
- Create, edit, delete and publish blog posts (drafts supported)
- Public home feed with debounced search and category filters
- Dashboard with per-user stats
- Protected routes, session restore on refresh, and automatic logout when a token expires
- Validation on the client and the server, plus rate limiting, Helmet and CORS

## Project structure
```
inkwell/
├── client/                      # React + Vite + Tailwind
│   └── src/
│       ├── main.jsx, App.jsx    # Providers and routes
│       ├── lib/                 # api.js (fetch wrapper), utils.js
│       ├── context/             # AuthContext, ToastContext
│       ├── components/          # Navbar, PostCard, ReadModal, Field, ProtectedRoute
│       └── pages/               # Home, Login, Register, Dashboard, CreatePost
└── server/                      # Express API
    └── src/                     # config, models, controllers, routes, middleware
```

## Run it locally
You need Node.js 18+ and MongoDB (local, or a free MongoDB Atlas cluster). Use two terminals.

**Terminal 1: API**
```bash
cd server
npm install
cp .env.example .env      # set MONGO_URI and a long random JWT_SECRET
npm run dev               # http://localhost:5000
```

**Terminal 2: React app**
```bash
cd client
npm install
npm run dev               # http://localhost:5173
```
Vite proxies `/api` to port 5000, so there are no CORS settings to change in development.

## Production build
```bash
cd client && npm run build      # creates client/dist
cd ../server && npm start       # serves the API and the built app on http://localhost:5000
```
To host the frontend separately (Vercel, Netlify), set `VITE_API_URL=https://your-api.example.com/api` in the client and add the frontend URL to `CLIENT_URL` in the server `.env`.

## Routes
| Path | Access | Page |
|---|---|---|
| `/` | Public | Home feed |
| `/login`, `/register` | Logged-out only | Auth forms |
| `/dashboard` | Logged-in | Your posts and stats |
| `/create`, `/edit/:id` | Logged-in | Create or edit a blog |

## API reference
Base URL: `/api`. Protected routes need `Authorization: Bearer <token>`.

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | No | Create an account, returns `{ user, token }` |
| POST | `/auth/login` | No | Log in, returns `{ user, token }` |
| GET | `/auth/me` | Yes | Current user |
| GET | `/posts?q=&category=` | No | Published posts |
| GET | `/posts/mine` | Yes | Your posts, drafts included |
| GET | `/posts/:id` | No | One published post (counts a view) |
| POST | `/posts` | Yes | Create a blog post |
| PUT | `/posts/:id` | Yes | Update your post |
| DELETE | `/posts/:id` | Yes | Delete your post |

Validation errors return `422` with `{ message, errors: { field: message } }`.

## Before going live
- Keep the JWT in an httpOnly cookie instead of localStorage for stronger XSS protection
- Self-host fonts, then re-enable Helmet's Content Security Policy
- Use a strong `JWT_SECRET` and restrict `CLIENT_URL` to your real domain
