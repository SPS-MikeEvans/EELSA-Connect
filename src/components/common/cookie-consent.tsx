"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Cookie } from "lucide-react";

export function CookieConsentBanner() {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true, // Always true and disabled
    analytics: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setOpen(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem("cookie_consent", JSON.stringify({ essential: true, analytics: true }));
    setOpen(false);
    // Here you would initialize analytics
  };

  const handleSavePreferences = () => {
    localStorage.setItem("cookie_consent", JSON.stringify(preferences));
    setOpen(false);
    // Initialize analytics if preferences.analytics is true
  };

  const handleRejectAll = () => {
      localStorage.setItem("cookie_consent", JSON.stringify({ essential: true, analytics: false }));
      setOpen(false);
  }

  return (
    <>
        {/* Floating trigger button if user wants to change later - usually hidden if open */}
        {!open && (
            <div className="fixed bottom-4 right-4 z-50">
                <Button variant="outline" size="icon" className="rounded-full shadow-md bg-background" onClick={() => setOpen(true)} title="Cookie Preferences">
                    <Cookie className="h-5 w-5" />
                </Button>
            </div>
        )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>We use cookies</DialogTitle>
            <DialogDescription>
              We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="essential" className="font-semibold">Strictly Necessary</Label>
                <span className="text-xs text-muted-foreground">Required for the site to function (e.g., login).</span>
              </div>
              <Switch id="essential" checked={true} disabled />
            </div>
            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="analytics" className="font-semibold">Analytics</Label>
                <span className="text-xs text-muted-foreground">Help us understand how you use the site.</span>
              </div>
              <Switch
                id="analytics"
                checked={preferences.analytics}
                onCheckedChange={(checked) => setPreferences({ ...preferences, analytics: checked })}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={handleAcceptAll} className="w-full">Accept All</Button>
            <Button onClick={handleSavePreferences} variant="secondary" className="w-full">Save Preferences</Button>
            <Button onClick={handleRejectAll} variant="ghost" className="w-full text-muted-foreground">Reject Non-Essential</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
