"use client";

import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingAuthButtons() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return (
      <Button size="lg" className="min-w-[160px]" asChild>
        <Link href="/browse">Browse Titles</Link>
      </Button>
    );
  }

  return (
    <>
      <Button size="lg" variant="secondary" className="min-w-[160px]" asChild>
        <Link href="/browse">Browse Titles</Link>
      </Button>
      <SignUpButton mode="modal">
        <Button
          size="lg"
          variant="outline"
          className="min-w-[160px]"
        >
          Create Account
        </Button>
      </SignUpButton>
    </>
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
        <Button variant="outline" size="sm" className="text-xs h-8">
          Sign Up
        </Button>
      </SignUpButton>
    </div>
  );
}
