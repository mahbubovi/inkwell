Module 03 done: my blog app now runs on a real database. 🗄️

For the Database Integration module of my MERN Stack course at Ostad, I connected Inkwell to MongoDB and finished the full data flow.

What I built:
• MongoDB connection with Mongoose models for users and blog posts
• Passwords stored as bcrypt hashes, never as plain text
• A home feed read from the database, with search, category filters and "Load more" pagination
• A dedicated page for each blog, with author, read time, view count and related posts
• A seed script so anyone can run the project with sample data in one command

What I learned:
• Designing schemas and indexes around the queries the app actually runs
• Why pagination matters once there is more than a handful of posts
• Checking ownership inside the database query, so users can only change their own posts

The video shows the whole flow: browse, search, open a post, sign up, publish, and refresh to see the data is still there.

Code: [paste your GitHub repo link]

Next up: deployment. Feedback is welcome!

#MongoDB #NodeJS #ExpressJS #ReactJS #MERN #WebDevelopment #Ostad
