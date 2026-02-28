/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as corrections from "../corrections.js";
import type * as crons from "../crons.js";
import type * as episodes from "../episodes.js";
import type * as healthRatings from "../healthRatings.js";
import type * as lib_adminAuth from "../lib/adminAuth.js";
import type * as lib_ratingValidation from "../lib/ratingValidation.js";
import type * as lib_seedData from "../lib/seedData.js";
import type * as ratings from "../ratings.js";
import type * as search from "../search.js";
import type * as seed from "../seed.js";
import type * as stripe from "../stripe.js";
import type * as titles from "../titles.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  corrections: typeof corrections;
  crons: typeof crons;
  episodes: typeof episodes;
  healthRatings: typeof healthRatings;
  "lib/adminAuth": typeof lib_adminAuth;
  "lib/ratingValidation": typeof lib_ratingValidation;
  "lib/seedData": typeof lib_seedData;
  ratings: typeof ratings;
  search: typeof search;
  seed: typeof seed;
  stripe: typeof stripe;
  titles: typeof titles;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
