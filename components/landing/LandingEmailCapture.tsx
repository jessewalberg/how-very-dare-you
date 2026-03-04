"use client";

import { useState } from "react";
import { Mail, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingEmailCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? "Something went wrong.");
        return;
      }

      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
        <Check className="size-4 text-emerald-600" />
        <p className="text-sm font-medium text-emerald-700">
          You&apos;re signed up! Check your inbox.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="h-10 w-full rounded-lg border border-border/60 bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground/40 focus:border-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
        </div>
        <Button type="submit" disabled={status === "loading"} className="shrink-0">
          {status === "loading" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Subscribe"
          )}
        </Button>
      </div>
      {status === "error" && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}
      <p className="text-[11px] text-muted-foreground/50">
        Get content advisory updates and new feature announcements. No spam.
      </p>
    </form>
  );
}
