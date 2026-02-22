import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Nightly batch rating at 2 AM UTC
crons.daily(
  "nightly-rating-batch",
  { hourUTC: 2, minuteUTC: 0 },
  api.ratings.runNightlyBatch
);

export default crons;
