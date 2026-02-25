"use client";

import { useState } from "react";
import Link from "next/link";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Menu, Search, Shield, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { TitleSearch } from "@/components/title/TitleSearch";
import { ThemeToggle } from "./ThemeToggle";

const NAV_LINKS = [
  { href: "/browse", label: "Browse" },
  { href: "/browse/no-flags", label: "No Flags" },
  { href: "/watchlist", label: "Watchlist" },
] as const;

export function Navbar() {
  const { isSignedIn, isLoaded } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-40",
        "border-b border-border/40 bg-background/80 backdrop-blur-xl",
        "supports-[backdrop-filter]:bg-background/60"
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0 group"
        >
          <div
            className={cn(
              "flex items-center justify-center size-7 rounded-lg",
              "bg-foreground text-background",
              "transition-transform duration-200 group-hover:scale-105"
            )}
          >
            <Shield className="size-4" strokeWidth={2.5} />
          </div>
          <span className="text-base font-bold tracking-tight hidden sm:inline">
            How Very Dare You
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1 ml-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium",
                "text-muted-foreground transition-colors duration-150",
                "hover:text-foreground hover:bg-muted/50"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop search — centered */}
        <div className="hidden md:flex flex-1 justify-center max-w-md mx-auto">
          <TitleSearch />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Mobile search toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden size-9"
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          >
            {mobileSearchOpen ? (
              <X className="size-4" />
            ) : (
              <Search className="size-4" />
            )}
            <span className="sr-only">Toggle search</span>
          </Button>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Auth */}
          {isLoaded && (
            <>
              {isSignedIn ? (
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "size-8",
                    },
                  }}
                />
              ) : (
                <SignInButton mode="modal">
                  <Button variant="outline" size="sm" className="text-xs h-8">
                    Sign In
                  </Button>
                </SignInButton>
              )}
            </>
          )}

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden size-9"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="size-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </div>
      </div>

      {/* Mobile search bar (slides down) */}
      {mobileSearchOpen && (
        <div className="md:hidden border-t border-border/40 px-4 py-2 animate-in slide-in-from-top-2 duration-200">
          <TitleSearch placeholder="Search titles..." />
        </div>
      )}

      {/* Mobile nav sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Shield className="size-4" strokeWidth={2.5} />
              How Very Dare You
            </SheetTitle>
            <SheetDescription className="sr-only">
              Navigation menu
            </SheetDescription>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center rounded-md px-3 py-2.5",
                  "text-sm font-medium text-foreground",
                  "transition-colors hover:bg-muted/50"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
