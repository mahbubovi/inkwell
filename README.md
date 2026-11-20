# Inkwell: a React blog app with a Node.js + Express API

A responsive blog application. The frontend is built with React, React Router and Tailwind CSS (Vite). It talks to a REST API built with Node.js, Express and MongoDB.

## Features
- Register and log in with JWT authentication and bcrypt password hashing
- Full CRUD for blog posts: create, read, update and delete, with drafts, publish and unpublish, and owner-only access
- Public home feed read from MongoDB with search (title, summary and content), category filters, sorting and "Load more" pagination. Filters live in the URL, so a filtered view can be shared
- A dedicated page for each blog (`/blog/:id`) with author, date, read time, view count, copy link and related posts
- Dashboard with per-user stats
- Protected routes, session restore on refresh, and automatic logout when a token expires
- Validation on the client and the server, plus rate limiting, Helmet and CORS

## CRUD at a glance
| Operation | Endpoint | Where in the app |
|---|---|---|
| Create | `POST /api/posts` | Create blog page: Publish or Save draft |
| Read | `GET /api/posts`, `/posts/:id`, `/posts/mine` | Home feed, blog page, dashboard. Authors can preview their own drafts |
| Update | `PUT /api/posts/:id`, `PATCH /api/posts/:id/status` | Edit page, plus Publish and Unpublish buttons on the dashboard |
| Delete | `DELETE /api/posts/:id` | Dashboard and blog page, each with a "Confirm delete" step |

Only the author can update or delete a post. Another user's request gets a 404, and drafts are never visible to anyone else.

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

## Get a MongoDB database
Pick one, then put its connection string in `server/.env` as `MONGO_URI`.

| Option | How | `MONGO_URI` |
|---|---|---|
| MongoDB Atlas (free, no install) | Create a free M0 cluster at mongodb.com/atlas, add a database user, allow your IP under Network Access, then copy the "Drivers" connection string | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/inkwell` |
| Local install | Install MongoDB Community Server (it runs as a service on port 27017) | `mongodb://127.0.0.1:27017/inkwell` |
| Docker | `docker run -d --name mongo -p 27017:27017 -v mongo-data:/data/db mongo:7` | `mongodb://127.0.0.1:27017/inkwell` |

## Run it locally
You need Node.js 18+ and a MongoDB database (see above). Use two terminals.

**Terminal 1: API**
```bash
cd server
npm install
cp .env.example .env      # set MONGO_URI and a long random JWT_SECRET
npm run seed              # optional: 3 sample authors and 10 posts (password: secret123)
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
| `/blog/:id` | Public | Individual blog page |
| `/login`, `/register` | Logged-out only | Auth forms |
| `/dashboard` | Logged-in | Your posts, stats, search, filters, publish toggle |
| `/create`, `/edit/:id` | Logged-in | Create or edit a blog |

## API reference
Base URL: `/api`. Protected routes need `Authorization: Bearer <token>`.

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | No | Create an account, returns `{ user, token }` |
| POST | `/auth/login` | No | Log in, returns `{ user, token }` |
| GET | `/auth/me` | Yes | Current user |
| GET | `/posts?q=&category=&sort=&page=&limit=` | No | Published posts, paginated: `{ posts, total, page, pages }`. `sort` is `newest`, `oldest` or `popular`; `q` searches title, summary and content |
| GET | `/posts/mine` | Yes | Your posts, drafts included |
| GET | `/posts/:id` | No | One published post plus related posts (counts a view). A draft is returned only to its author |
| POST | `/posts` | Yes | Create a blog post |
| PUT | `/posts/:id` | Yes | Update your post |
| PATCH | `/posts/:id/status` | Yes | Publish or unpublish your post (publishing needs at least 50 words) |
| DELETE | `/posts/:id` | Yes | Delete your post |

Validation errors return `422` with `{ message, errors: { field: message } }`.

## Database design (MongoDB + Mongoose)
| Collection | Fields | Notes |
|---|---|---|
| `users` | `name`, `email` (unique), `password`, timestamps | Password is stored as a bcrypt hash (cost 12) and is excluded from queries by default (`select: false`) |
| `posts` | `title`, `body`, `excerpt`, `category`, `status`, `views`, `readMinutes`, `author` (ref to `users`), timestamps | Index on `{ status, createdAt }` for the feed and on `author` for the dashboard; `author` is populated with the writer's name |

How the data stays safe:
- Plain-text passwords never reach the database or any API response
- The JWT secret and database URL live in `.env`, which is git-ignored
- Users can only edit or delete their own posts; the check is part of the database query
- Every write is validated on the server before it touches the database

## Before going live
- Keep the JWT in an httpOnly cookie instead of localStorage for stronger XSS protection
- Self-host fonts, then re-enable Helmet's Content Security Policy
- Use a strong `JWT_SECRET` and restrict `CLIENT_URL` to your real domain
