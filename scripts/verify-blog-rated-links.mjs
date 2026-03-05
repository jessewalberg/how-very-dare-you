import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { BLOG_POSTS } from "../lib/blog";

const root = process.cwd();

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function getPostFilePath(slug) {
  const mdx = join(root, "app", "(app)", "blog", slug, "page.mdx");
  const tsx = join(root, "app", "(app)", "blog", slug, "page.tsx");
  if (existsSync(mdx)) return mdx;
  if (existsSync(tsx)) return tsx;
  return null;
}

const advisoryPosts = BLOG_POSTS.filter((post) => post.category === "advisory");

for (const post of BLOG_POSTS) {
  const file = getPostFilePath(post.slug);
  if (!file) {
    fail(`Missing post page file for slug=${post.slug}`);
    continue;
  }

  const content = readFileSync(file, "utf8");
  if (post.linkedTitleSlug) {
    const requiredPath = `/title/${post.linkedTitleSlug}`;
    if (!content.includes(requiredPath)) {
      fail(`Post ${post.slug} must include direct advisory link ${requiredPath}`);
    } else {
      pass(`Post ${post.slug} links to ${requiredPath}`);
    }
  }
}

for (const post of advisoryPosts) {
  if (!post.linkedTitleSlug) {
    fail(`Advisory post ${post.slug} must define linkedTitleSlug`);
  } else {
    pass(`Advisory post ${post.slug} defines linkedTitleSlug`);
  }
}

const shouldVerifyRemote = process.env.BLOG_VERIFY_REMOTE === "1";
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!shouldVerifyRemote) {
  console.log("SKIP remote rated-title verification (set BLOG_VERIFY_REMOTE=1 to enforce)");
} else if (!convexUrl) {
  fail("NEXT_PUBLIC_CONVEX_URL is required when BLOG_VERIFY_REMOTE=1");
} else {
  const client = new ConvexHttpClient(convexUrl);
  for (const post of advisoryPosts) {
    if (!post.linkedTitleSlug) continue;

    try {
      const title = await client.query(api.titles.getTitleBySlug, {
        slug: post.linkedTitleSlug,
      });
      if (!title) {
        fail(`linkedTitleSlug ${post.linkedTitleSlug} not found for ${post.slug}`);
        continue;
      }
      if (title.status !== "rated") {
        fail(
          `linkedTitleSlug ${post.linkedTitleSlug} for ${post.slug} is status=${title.status}, expected rated`
        );
        continue;
      }
      pass(`linkedTitleSlug ${post.linkedTitleSlug} exists and is rated`);
    } catch (error) {
      fail(
        `Convex lookup failed for ${post.slug}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

if (process.exitCode === 1) {
  process.exit(1);
}
