"use client";

import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingAuthButtons() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return (
      <div className="flex w-full justify-center">
        <Button size="lg" className="min-w-[180px]" asChild>
          <Link href="/browse">Browse Titles</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row">
      <Button size="lg" className="min-w-[180px]" asChild>
        <Link href="/browse">Browse Titles</Link>
      </Button>
      <SignUpButton mode="modal">
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
        >
          Create free account
        </Button>
      </SignUpButton>
    </div>
  );
}

export function LandingNavAuth() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return (
      <Button variant="outline" size="sm" className="text-xs h-8" asChild>
        <Link href="/browse">Go to App</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <SignInButton mode="modal">
        <Button variant="ghost" size="sm" className="text-xs h-8">
          Sign In
        </Button>
      </SignInButton>
      <SignUpButton mode="modal">
        <Button variant="outline" size="sm" className="text-xs h-8 text-foreground">
          Sign Up
        </Button>
      </SignUpButton>
    </div>
  );
}
