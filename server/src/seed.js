// Fills the database with sample users and posts for development.
//   npm run seed            adds anything that is missing
//   npm run seed -- --reset wipes users and posts first
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/Post');

if (process.env.NODE_ENV === 'production') { console.error('Refusing to seed in production.'); process.exit(1); }

const day = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const users = [
  { name: 'Priya Raman', email: 'priya@example.com' },
  { name: 'Tomás Duarte', email: 'tomas@example.com' },
  { name: 'Samir Okafor', email: 'samir@example.com' },
];
const PASSWORD = 'secret123';

const posts = [
  ['priya@example.com', 'Designing APIs your future self will thank you for', 'Engineering', 1,
    'Consistent naming, predictable errors and versioning from day one save more time than any framework choice.',
    'Write the error format first, then the happy path. Every endpoint should fail the same way, with a message a person can act on and a field name a client can map to an input. Version the API before you need to, because the day you need it is already too late.'],
  ['tomas@example.com', 'A field guide to spacing in interfaces', 'Design', 2,
    'Most layouts feel off because spacing has no system. Pick a base unit, then let every gap be a multiple of it.',
    'Start with four pixels, and only ever use four, eight, sixteen, twenty four and thirty two. Group related items tightly and separate sections generously. When two elements belong together, the space between them should say so before anyone reads a word.'],
  ['samir@example.com', 'Your first year as a junior developer', 'Career', 3,
    'Ask earlier, read the tests, and keep a log of what you learned each week. The log pays off at review time.',
    'Most juniors wait too long before asking for help because they fear looking slow. A better rule is to spend thirty focused minutes alone, write down what you tried, then ask. Seniors answer faster when the question already contains your attempts and your guess.'],
  ['priya@example.com', 'Indexes: the cheapest performance win in MongoDB', 'Engineering', 4,
    'Before you reach for caching, check whether your slowest query has an index that matches how you filter and sort.',
    'Run the query with explain and look for a collection scan. A compound index that follows your filter fields, then your sort field, usually turns a full scan into a quick lookup. Add indexes for the queries you actually run, not for every field you own.'],
  ['tomas@example.com', 'Picking a color palette without a brand guide', 'Design', 5,
    'Start with one accent, two neutrals and a single error color. Test contrast before you fall in love with any of them.',
    'A small palette is easier to keep consistent. Define the colors as variables once, then use only those names in your components. If a new color seems necessary, ask first whether spacing or weight could do the same job.'],
  ['samir@example.com', 'Writing a product brief people actually read', 'Product', 6,
    'One page, one decision, one owner. Here is the structure that survived dozens of rewrites on our team.',
    'Open with the decision you need and the date you need it by. Follow with the problem in two sentences, the options you considered, and your recommendation. Anything longer belongs in an appendix that people can open if they want to.'],
  ['priya@example.com', 'Why we validate on the server, even with a perfect form', 'Engineering', 7,
    'Client checks make forms feel fast, but only the server can be trusted. This is how we split the work.',
    'The browser validates for speed and kindness: it tells people what to fix before they wait for a round trip. The server validates for safety: it assumes every request could come from a script and rejects anything that breaks the rules. Return errors keyed by field so the form can show them in place.'],
  ['tomas@example.com', 'Notes on a quieter standup', 'Product', 8,
    'What changed when we moved status updates to writing and kept the meeting only for blockers.',
    'We replaced the daily round of updates with a short written post each morning. The meeting shrank to ten minutes and covered only what was stuck. People reported fewer interruptions, and the written trail made it easy to catch up after a day off.'],
  ['samir@example.com', 'How I prepare a portfolio project for recruiters', 'Career', 9,
    'A clear README, a live demo and a short video beat a long list of technologies every time.',
    'Recruiters spend under a minute on your repository. Put the demo link and a screenshot at the top, then explain what the project does and the one decision you are proud of. Keep the setup steps short enough that someone can run it in five minutes.'],
  ['tomas@example.com', 'Designing empty states that help', 'Design', 10,
    'An empty screen is the best moment to teach someone what to do next. Most apps waste it.',
    'Say what belongs here, why it matters, and offer one clear action. Avoid cartoons that add nothing. A single sentence and a button usually does more than a full illustration, and it keeps the screen calm.'],
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  if (process.argv.includes('--reset')) { await Post.deleteMany({}); await User.deleteMany({}); console.log('Cleared users and posts.'); }

  const byEmail = {};
  for (const u of users) {
    byEmail[u.email] = (await User.findOne({ email: u.email })) || (await User.create({ ...u, password: PASSWORD }));
  }
  let added = 0;
  for (const [email, title, category, ago, excerpt, extra] of posts) {
    if (await Post.exists({ title })) continue;
    await Post.create({ title, category, excerpt, body: `${excerpt}\n\n${extra}`, status: 'published',
      author: byEmail[email]._id, views: 20 + ago * 37, createdAt: day(ago), updatedAt: day(ago) });
    added++;
  }
  console.log(`Seeded ${added} posts. Sample logins use the password "${PASSWORD}" (e.g. priya@example.com).`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
