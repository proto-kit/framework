"use client";

import { Sparkles } from "lucide-react";

import GlobalSearch from "@/components/search/GlobalSearch";
import DashboardStats from "@/components/dashboard/DashboardStats";
import config from "@/config";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-12 sm:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              {config.DASHBOARD_TITLE}
            </h1>
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            {config.DASHBOARD_SLOGAN}
          </p>
        </div>

        <div className="mb-16 sm:mb-20 flex justify-center">
          <GlobalSearch />
        </div>

        <div className="space-y-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
              Network Overview
            </h2>
            <p className="text-muted-foreground">
              Real-time statistics and latest activity
            </p>
          </div>
          <DashboardStats />
        </div>
      </div>
    </div>
  );
}
