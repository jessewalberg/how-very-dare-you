"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Film,
  ListOrdered,
  MessageSquare,
  RefreshCw,
  Save,
  Users,
  Zap,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  formatPricePerMillion,
  MODEL_PROVIDER_LABELS,
  SUPPORTED_MODEL_PROVIDERS,
  type OpenRouterCatalogModel,
  type SupportedModelProvider,
} from "@/lib/openrouterModels";

const INITIAL_PROVIDER_FILTERS: Record<SupportedModelProvider, boolean> = {
  anthropic: true,
  google: true,
  openai: true,
  "x-ai": true,
};

function formatContextWindow(tokens: number): string {
  if (!tokens || tokens <= 0) return "Unknown context window";
  return `${tokens.toLocaleString("en-US")} token context`;
}

function StatCard({
  title,
  icon: Icon,
  href,
  total,
  breakdowns,
}: {
  title: string;
  icon: React.ElementType;
  href: string;
  total: number;
  breakdowns: { label: string; value: number; className?: string }[];
}) {
  return (
    <Link href={href} className="group">
      <Card className="transition-all duration-200 hover:shadow-md hover:border-foreground/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}</div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {breakdowns.map((b) => (
              <span
                key={b.label}
                className={cn("text-xs text-muted-foreground", b.className)}
              >
                {b.value} {b.label}
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            View all <ArrowRight className="size-3" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const stats = useQuery(api.admin.getDashboardStats);
  const ratingModelConfig = useQuery(api.admin.getRatingModelConfig);
  const setRatingModelConfig = useMutation(api.admin.setRatingModelConfig);
  const listOpenRouterModels = useAction(api.admin.listOpenRouterModels);

  const [modelInput, setModelInput] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [providerFilters, setProviderFilters] = useState<
    Record<SupportedModelProvider, boolean>
  >(INITIAL_PROVIDER_FILTERS);

  const [modelCatalog, setModelCatalog] = useState<OpenRouterCatalogModel[]>([]);
  const [modelCatalogLoading, setModelCatalogLoading] = useState(false);
  const [modelCatalogError, setModelCatalogError] = useState<string | null>(
    null
  );
  const [modelCatalogFetchedAt, setModelCatalogFetchedAt] = useState<
    number | null
  >(null);

  const [savingModel, setSavingModel] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelSavedAt, setModelSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (ratingModelConfig?.model) {
      setModelInput((prev) => (prev ? prev : ratingModelConfig.model));
    }
  }, [ratingModelConfig?.model]);

  const loadModelCatalog = useCallback(async () => {
    setModelCatalogError(null);
    setModelCatalogLoading(true);
    try {
      const result = await listOpenRouterModels({});
      setModelCatalog(result.models);
      setModelCatalogFetchedAt(result.fetchedAt);
    } catch (e) {
      setModelCatalogError(
        e instanceof Error ? e.message : "Failed to load OpenRouter models"
      );
    } finally {
      setModelCatalogLoading(false);
    }
  }, [listOpenRouterModels]);

  useEffect(() => {
    void loadModelCatalog();
  }, [loadModelCatalog]);

  const filteredModels = useMemo(() => {
    const search = modelSearch.trim().toLowerCase();
    return modelCatalog.filter((model) => {
      if (!providerFilters[model.provider]) return false;
      if (!search) return true;
      const haystack = `${model.name} ${model.id} ${model.description ?? ""}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [modelCatalog, modelSearch, providerFilters]);

  const groupedModels = useMemo(
    () =>
      SUPPORTED_MODEL_PROVIDERS.map((provider) => ({
        provider,
        models: filteredModels.filter((m) => m.provider === provider),
      })).filter((group) => group.models.length > 0),
    [filteredModels]
  );

  const selectedModelInfo = useMemo(
    () => modelCatalog.find((model) => model.id === modelInput.trim()),
    [modelCatalog, modelInput]
  );

  const previewModels = filteredModels.slice(0, 20);

  async function handleSaveModel() {
    if (!selectedModelInfo) {
      setModelError("Select a model from the dropdown first.");
      return;
    }
    setModelError(null);
    setSavingModel(true);
    try {
      const result = await setRatingModelConfig({ model: selectedModelInfo.id });
      setModelInput(result.model);
      setModelSavedAt(Date.now());
    } catch (e) {
      setModelError(
        e instanceof Error ? e.message : "Failed to save rating model"
      );
    } finally {
      setSavingModel(false);
    }
  }

  function toggleProviderFilter(provider: SupportedModelProvider) {
    setProviderFilters((prev) => ({
      ...prev,
      [provider]: !prev[provider],
    }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          System overview and management tools.
        </p>
      </div>

      {!stats ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
            <StatCard
              title="Titles"
              icon={Film}
              href="/admin/titles"
              total={stats.titleStats.total}
              breakdowns={[
                { label: "rated", value: stats.titleStats.rated },
                { label: "pending", value: stats.titleStats.pending },
                { label: "rating", value: stats.titleStats.rating },
                { label: "disputed", value: stats.titleStats.disputed },
                { label: "reviewed", value: stats.titleStats.reviewed },
              ]}
            />
            <StatCard
              title="Users"
              icon={Users}
              href="/admin"
              total={stats.userStats.total}
              breakdowns={[
                { label: "free", value: stats.userStats.free },
                { label: "paid", value: stats.userStats.paid },
              ]}
            />
            <StatCard
              title="Corrections"
              icon={MessageSquare}
              href="/admin/corrections"
              total={stats.correctionStats.total}
              breakdowns={[
                { label: "pending", value: stats.correctionStats.pending },
                { label: "accepted", value: stats.correctionStats.accepted },
                { label: "rejected", value: stats.correctionStats.rejected },
              ]}
            />
            <StatCard
              title="Queue"
              icon={ListOrdered}
              href="/admin/queue"
              total={stats.queueStats.total}
              breakdowns={[
                { label: "queued", value: stats.queueStats.queued },
                { label: "processing", value: stats.queueStats.processing },
                { label: "completed", value: stats.queueStats.completed },
                { label: "failed", value: stats.queueStats.failed },
              ]}
            />
            <StatCard
              title="Quality"
              icon={AlertTriangle}
              href="/admin/queue"
              total={
                (stats.qualityStats?.titleNeedsReview ?? 0) +
                (stats.qualityStats?.episodeNeedsReview ?? 0)
              }
              breakdowns={[
                {
                  label: "titles flagged",
                  value: stats.qualityStats?.titleNeedsReview ?? 0,
                },
                {
                  label: "episodes flagged",
                  value: stats.qualityStats?.episodeNeedsReview ?? 0,
                },
                {
                  label: "critical",
                  value:
                    (stats.qualityStats?.titleCritical ?? 0) +
                    (stats.qualityStats?.episodeCritical ?? 0),
                  className: "text-red-600",
                },
              ]}
            />
            <StatCard
              title="Overstim Queue"
              icon={Zap}
              href="/admin/queue"
              total={stats.overstimQueueStats.total}
              breakdowns={[
                { label: "queued", value: stats.overstimQueueStats.queued },
                { label: "processing", value: stats.overstimQueueStats.processing },
                { label: "completed", value: stats.overstimQueueStats.completed },
                { label: "skipped", value: stats.overstimQueueStats.skipped },
                { label: "failed", value: stats.overstimQueueStats.failed, className: "text-red-600" },
              ]}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">OpenRouter Rating Model</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {SUPPORTED_MODEL_PROVIDERS.map((provider) => (
                  <Button
                    key={provider}
                    type="button"
                    size="sm"
                    variant={providerFilters[provider] ? "default" : "outline"}
                    onClick={() => toggleProviderFilter(provider)}
                  >
                    {MODEL_PROVIDER_LABELS[provider]}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setProviderFilters(INITIAL_PROVIDER_FILTERS)}
                >
                  Reset Filters
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={modelCatalogLoading}
                  onClick={() => void loadModelCatalog()}
                >
                  <RefreshCw
                    className={cn("size-3.5", modelCatalogLoading && "animate-spin")}
                  />
                  Refresh Catalog
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder="Filter model list by name, id, or description"
                />
                <Select
                  value={filteredModels.some((m) => m.id === modelInput) ? modelInput : undefined}
                  onValueChange={(value) => {
                    setModelInput(value);
                    setModelError(null);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        modelCatalogLoading
                          ? "Loading active models..."
                          : "Select an active model"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {groupedModels.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        No active models match the current filters.
                      </div>
                    ) : (
                      groupedModels.map((group) => (
                        <SelectGroup key={group.provider}>
                          <SelectLabel>
                            {MODEL_PROVIDER_LABELS[group.provider]}
                          </SelectLabel>
                          {group.models.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name} · {model.id}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Active source:{" "}
                  <span className="font-medium">
                    {ratingModelConfig?.source === "admin"
                      ? "admin override"
                      : ratingModelConfig?.source === "env"
                        ? "environment fallback"
                        : "default fallback"}
                  </span>
                  {ratingModelConfig?.source === "admin" &&
                    ratingModelConfig.updatedAt && (
                      <span>
                        {" "}
                        · Updated{" "}
                        {new Date(ratingModelConfig.updatedAt).toLocaleString(
                          "en-US"
                        )}
                      </span>
                    )}
                  {modelCatalogFetchedAt && (
                    <span>
                      {" "}
                      · Catalog refreshed{" "}
                      {new Date(modelCatalogFetchedAt).toLocaleTimeString(
                        "en-US"
                      )}
                    </span>
                  )}
                  {modelSavedAt && (
                    <span>
                      {" "}
                      · Saved {new Date(modelSavedAt).toLocaleTimeString("en-US")}
                    </span>
                  )}
                </p>

                <Button
                  type="button"
                  onClick={handleSaveModel}
                  disabled={savingModel || !selectedModelInfo}
                  className="gap-1.5"
                >
                  <Save className="size-4" />
                  {savingModel ? "Saving..." : "Save Model"}
                </Button>
              </div>

              {selectedModelInfo && (
                <div className="rounded-md border bg-muted/20 p-3 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{selectedModelInfo.name}</p>
                    <Badge variant="secondary">
                      {MODEL_PROVIDER_LABELS[selectedModelInfo.provider]}
                    </Badge>
                    {ratingModelConfig?.model === selectedModelInfo.id && (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    {selectedModelInfo.id}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatContextWindow(selectedModelInfo.contextLength)} · Input{" "}
                    {formatPricePerMillion(selectedModelInfo.promptPricePerToken)} ·
                    Output {formatPricePerMillion(selectedModelInfo.completionPricePerToken)}
                  </p>
                  {selectedModelInfo.description && (
                    <p className="text-xs text-muted-foreground">
                      {selectedModelInfo.description}
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-md border">
                {previewModels.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-muted-foreground">
                    No models match the selected providers/search.
                  </div>
                ) : (
                  <div className="max-h-72 divide-y overflow-auto">
                    {previewModels.map((model) => (
                      <div key={model.id} className="px-3 py-2 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{model.name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {MODEL_PROVIDER_LABELS[model.provider]}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {formatContextWindow(model.contextLength)}
                          </span>
                        </div>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {model.id}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          In {formatPricePerMillion(model.promptPricePerToken)} · Out{" "}
                          {formatPricePerMillion(model.completionPricePerToken)}
                        </p>
                        {model.description && (
                          <p className="text-[11px] text-muted-foreground">
                            {model.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {filteredModels.length > previewModels.length && (
                <p className="text-xs text-muted-foreground">
                  Showing first {previewModels.length} of {filteredModels.length} matching
                  models.
                </p>
              )}

              {modelCatalogError && (
                <p className="text-xs text-red-600">{modelCatalogError}</p>
              )}
              {modelError && (
                <p className="text-xs text-red-600">{modelError}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
