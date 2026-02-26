"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import {
  Film,
  Users,
  MessageSquare,
  ListOrdered,
  ArrowRight,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          System overview and management tools.
        </p>
      </div>

      {!stats ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>
      )}
    </div>
  );
}
