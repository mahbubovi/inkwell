Module 05 done: secure authentication and a private dashboard. 🔐

For the Authentication & Dashboard module of my MERN Stack course at Ostad, I upgraded Inkwell's login system to work the way production apps do.

What I built:
• Short-lived JWT access tokens, kept in memory, plus a rotating refresh token in an httpOnly cookie
• Silent refresh, so users stay logged in without ever seeing an error
• Protected dashboard and profile routes, on both the React side and the API
• A dashboard that shows only the logged-in user's posts
• A profile page: edit details, change password, and see or end sessions on other devices
• Logout that works across every open tab

What I learned:
• Why tokens should not live in localStorage, and how httpOnly cookies fix that
• How refresh token rotation and hashed sessions make logins revocable
• Why authorization has to be checked on the server, not just hidden in the UI

The video shows the full flow: protected routes, sign up, profile, signing out another device, changing a password, and a second user seeing a completely different dashboard.

Code: [paste your GitHub repo link]

Next up: deployment. Feedback is welcome!

#JWT #Authentication #NodeJS #ExpressJS #ReactJS #MongoDB #MERN #WebDevelopment #Ostad
