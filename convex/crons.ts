import { cronJobs } from "convex/server";
// import { api } from "./_generated/api";

const crons = cronJobs();

// ── Cron jobs (commented out until ready to go live) ─────

// 1. Nightly batch rating — 2 AM UTC daily
//    Fetches popular titles from TMDB, queues unrated ones, processes queue.
// crons.daily(
//   "nightly-rating-batch",
//   { hourUTC: 2, minuteUTC: 0 },
//   api.ratings.runNightlyBatch
// );

// 2. Reset rate limits — midnight UTC daily
//    Resets onDemandRatingsToday counter for all users.
// crons.daily(
//   "reset-rate-limits",
//   { hourUTC: 0, minuteUTC: 0 },
//   api.users.resetDailyRateLimits
// );

// 3. Refresh streaming availability — Sunday 3 AM UTC weekly
//    Updates streaming provider data for all rated titles from TMDB.
// crons.weekly(
//   "refresh-streaming",
//   { dayOfWeek: "sunday", hourUTC: 3, minuteUTC: 0 },
//   api.titles.refreshStreamingAvailability
// );

// 4. Overstimulation batch — 4 AM UTC daily (after cultural ratings at 2 AM)
//    Analyzes trailers via video analysis service + AI for overstimulation scores.
// crons.daily(
//   "overstimulation-batch",
//   { hourUTC: 4, minuteUTC: 0 },
//   api.healthRatings.runOverstimulationBatch
// );

export default crons;
