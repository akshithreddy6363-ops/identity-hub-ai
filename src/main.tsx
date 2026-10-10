import "@vly-ai/integrations";
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const AppShell = lazy(() => import("@/components/layout/AppShell.tsx"));
const ProfileEditor = lazy(() => import("./pages/ProfileEditor.tsx"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage.tsx"));
const AchievementsPage = lazy(() => import("./pages/AchievementsPage.tsx"));
const ChallengesPage = lazy(() => import("./pages/ChallengesPage.tsx"));
const RoadmapPage = lazy(() => import("./pages/RoadmapPage.tsx"));
const TeamFinderPage = lazy(() => import("./pages/TeamFinderPage.tsx"));
const ShareLinksPage = lazy(() => import("./pages/ShareLinksPage.tsx"));
const IntegrationsPage = lazy(() => import("./pages/IntegrationsPage.tsx"));
const SharedProfile = lazy(() => import("./pages/SharedProfile.tsx"));
const AIStudio = lazy(() => import("./pages/AIStudio.tsx"));
const OpportunityMatcherPage = lazy(
  () => import("./pages/OpportunityMatcherPage.tsx"),
);
const SettingsPage = lazy(() => import("./pages/SettingsPage.tsx"));
const PublicProfile = lazy(() => import("./pages/PublicProfile.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/** Renders the public profile page for /p/:slug */
function PublicProfileRoute() {
  const { slug } = useParams();
  return <PublicProfile slug={slug ?? ""} />;
}

/** Renders a tailored Smart Share Profile for /s/:token */
function SharedProfileRoute() {
  const { token } = useParams();
  return <SharedProfile token={token ?? ""} />;
}

/** Silent error boundary - if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in the browser runtime). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[Preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-1 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <ConvexAuthProvider client={convex}>
          <BrowserRouter>
            <RouteSyncer />
            <Suspense fallback={<RouteLoading />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route
                  path="/auth"
                  element={<AuthPage redirectAfterAuth="/dashboard" />}
                />
                <Route path="/p/:slug" element={<PublicProfileRoute />} />
                <Route path="/s/:token" element={<SharedProfileRoute />} />
                <Route
                  element={
                    <RequireAuth redirectImmediately>
                      <AppShell />
                    </RequireAuth>
                  }
                >
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route
                    path="/dashboard/profile"
                    element={<ProfileEditor />}
                  />
                  <Route
                    path="/dashboard/projects"
                    element={<ProjectsPage />}
                  />
                  <Route
                    path="/dashboard/achievements"
                    element={<AchievementsPage />}
                  />
                  <Route
                    path="/dashboard/challenges"
                    element={<ChallengesPage />}
                  />
                  <Route path="/dashboard/roadmap" element={<RoadmapPage />} />
                  <Route path="/dashboard/team" element={<TeamFinderPage />} />
                  <Route path="/dashboard/share" element={<ShareLinksPage />} />
                  <Route
                    path="/dashboard/integrations"
                    element={<IntegrationsPage />}
                  />
                  <Route path="/dashboard/ai" element={<AIStudio />} />
                  <Route
                    path="/dashboard/matcher"
                    element={<OpportunityMatcherPage />}
                  />
                  <Route
                    path="/dashboard/settings"
                    element={<SettingsPage />}
                  />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster />
        </ConvexAuthProvider>
      </ThemeProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
