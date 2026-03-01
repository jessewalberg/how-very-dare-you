export type SidebarTitleType = "movie" | "tv" | "youtube";

export type QueueSidebarInput = {
  type: "movie" | "tv" | "episode";
  titleId?: string | null;
  episodeId?: string | null;
};

export type QueueSidebarTarget =
  | { kind: "episode"; episodeId: string }
  | { kind: "title"; titleId: string }
  | null;

export function resolveAdminQueueSidebarTarget(
  item: QueueSidebarInput
): QueueSidebarTarget {
  if (item.type === "episode") {
    return item.episodeId ? { kind: "episode", episodeId: item.episodeId } : null;
  }
  return item.titleId ? { kind: "title", titleId: item.titleId } : null;
}

export function canOpenAdminTitleSidebar(type: SidebarTitleType): boolean {
  return type !== "tv";
}

export function canOpenUserEpisodeSidebar(type: SidebarTitleType): boolean {
  return type === "tv";
}
