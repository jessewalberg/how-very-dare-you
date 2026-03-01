import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TitleSearch } from "@/components/title/TitleSearch";

export default function TitleNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
        <SearchX className="size-7 text-muted-foreground/50" />
      </div>
      <h1 className="mt-4 text-2xl font-bold">Title Not Found</h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        This title doesn&apos;t exist or may have been removed from our
        database.
      </p>
      <div className="mt-6 w-full max-w-md">
        <TitleSearch placeholder="Search for another title..." />
      </div>
      <Button variant="outline" className="mt-6" asChild>
        <Link href="/browse">
          <ArrowLeft className="mr-1.5 size-4" />
          Back to Browse
        </Link>
      </Button>
    </div>
  );
}
