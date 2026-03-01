import assert from "node:assert/strict";
import {
  canOpenAdminTitleSidebar,
  canOpenUserEpisodeSidebar,
  resolveAdminQueueSidebarTarget,
} from "../../lib/sidebarBehavior";

function runCase(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runCase("queue episode rows resolve to episode sidebar targets", () => {
  const target = resolveAdminQueueSidebarTarget({
    type: "episode",
    episodeId: "ep_123",
    titleId: "title_123",
  });
  assert.deepEqual(target, { kind: "episode", episodeId: "ep_123" });
});

runCase("queue movie rows resolve to title sidebar targets", () => {
  const target = resolveAdminQueueSidebarTarget({
    type: "movie",
    titleId: "title_abc",
  });
  assert.deepEqual(target, { kind: "title", titleId: "title_abc" });
});

runCase("queue rows with missing ids do not resolve to sidebar targets", () => {
  const titleTarget = resolveAdminQueueSidebarTarget({
    type: "movie",
  });
  assert.equal(titleTarget, null);

  const episodeTarget = resolveAdminQueueSidebarTarget({
    type: "episode",
  });
  assert.equal(episodeTarget, null);
});

runCase("admin title sidebar opens only for standalone types", () => {
  assert.equal(canOpenAdminTitleSidebar("movie"), true);
  assert.equal(canOpenAdminTitleSidebar("youtube"), true);
  assert.equal(canOpenAdminTitleSidebar("tv"), false);
});

runCase("user episode sidebar is available only for tv titles", () => {
  assert.equal(canOpenUserEpisodeSidebar("tv"), true);
  assert.equal(canOpenUserEpisodeSidebar("movie"), false);
  assert.equal(canOpenUserEpisodeSidebar("youtube"), false);
});
