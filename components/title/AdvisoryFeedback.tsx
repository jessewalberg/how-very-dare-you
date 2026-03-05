"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import posthog from "posthog-js";
import { CheckCircle2, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ADVISORY_FEEDBACK_REASON_LABELS,
  ADVISORY_FEEDBACK_REASON_TAGS,
  buildAdvisoryFeedbackEventProperties,
  type AdvisoryFeedbackReasonTag,
  type AdvisoryFeedbackSurface,
} from "@/lib/advisoryFeedback";
import { cn } from "@/lib/utils";

interface AdvisoryFeedbackProps {
  titleId: Id<"titles">;
  surface?: AdvisoryFeedbackSurface;
}

type FeedbackState = "idle" | "negative" | "submitted";

function readSessionId(): string | undefined {
  try {
    const distinctId = posthog.get_distinct_id()?.trim();
    return distinctId || undefined;
  } catch {
    return undefined;
  }
}

export function AdvisoryFeedback({
  titleId,
  surface = "title_detail",
}: AdvisoryFeedbackProps) {
  const { isSignedIn } = useUser();
  const submitFeedback = useMutation(api.feedback.submitTitleFeedback);
  const [state, setState] = useState<FeedbackState>("idle");
  const [reasonTag, setReasonTag] = useState<AdvisoryFeedbackReasonTag | null>(
    null
  );
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleHelpful() {
    if (submitting || state === "submitted") return;
    setSubmitting(true);
    setError(null);
    posthog.capture(
      "advisory_helpful_clicked",
      buildAdvisoryFeedbackEventProperties({
        titleId: String(titleId),
        helpful: true,
        surface,
        signedIn: Boolean(isSignedIn),
      })
    );
    try {
      await submitFeedback({
        titleId,
        helpful: true,
        sessionId: readSessionId(),
        surface,
      });
      posthog.capture(
        "advisory_feedback_submitted",
        buildAdvisoryFeedbackEventProperties({
          titleId: String(titleId),
          helpful: true,
          surface,
          signedIn: Boolean(isSignedIn),
        })
      );
      setState("submitted");
    } catch {
      setError("Could not save feedback right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNeedsWork() {
    if (submitting || state === "submitted") return;
    posthog.capture(
      "advisory_not_helpful_clicked",
      buildAdvisoryFeedbackEventProperties({
        titleId: String(titleId),
        helpful: false,
        surface,
        signedIn: Boolean(isSignedIn),
      })
    );
    setState("negative");
    setError(null);
  }

  async function handleNegativeSubmit() {
    if (!reasonTag || submitting || state === "submitted") return;
    setSubmitting(true);
    setError(null);
    try {
      await submitFeedback({
        titleId,
        helpful: false,
        reasonTag,
        comment: comment.trim() || undefined,
        sessionId: readSessionId(),
        surface,
      });
      posthog.capture(
        "advisory_feedback_submitted",
        buildAdvisoryFeedbackEventProperties({
          titleId: String(titleId),
          helpful: false,
          surface,
          reasonTag,
          signedIn: Boolean(isSignedIn),
        })
      );
      setState("submitted");
    } catch {
      setError("Could not save feedback right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (state === "submitted") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="size-4" />
          Thanks, your feedback helps improve future advisories.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold">
          Was this AI-analyzed advisory helpful?
        </p>
        <p className="text-xs text-muted-foreground">
          Quick feedback helps us improve clarity and calibration. No account
          required.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleHelpful}
          disabled={submitting}
          className="gap-1.5"
        >
          <ThumbsUp className="size-3.5" />
          Yes, helpful
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleNeedsWork}
          disabled={submitting}
          className="gap-1.5"
        >
          <ThumbsDown className="size-3.5" />
          Needs work
        </Button>
      </div>

      {state === "negative" && (
        <div className="space-y-3 rounded-lg border border-border/50 bg-background p-3">
          <p className="text-xs font-semibold text-muted-foreground">
            What should we improve?
          </p>
          <div className="flex flex-wrap gap-2">
            {ADVISORY_FEEDBACK_REASON_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setReasonTag(tag)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  reasonTag === tag
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                )}
              >
                {ADVISORY_FEEDBACK_REASON_LABELS[tag]}
              </button>
            ))}
          </div>
          <Textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Optional details..."
            rows={3}
            className="text-sm"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleNegativeSubmit}
            disabled={!reasonTag || submitting}
            className="gap-1.5"
          >
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Submit feedback
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
