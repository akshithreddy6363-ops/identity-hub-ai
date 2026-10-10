import { Brand, BrandMark } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { SAMPLE_SLUG, initials } from "@/lib/linksphere";
import { cn } from "@/lib/utils";
import {
  Award,
  ExternalLink,
  FolderGit2,
  Github,
  LayoutDashboard,
  LogOut,
  Menu,
  Route,
  Settings,
  Share2,
  Sparkles,
  Swords,
  Target,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";

const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/dashboard/profile", label: "Profile", icon: UserRound },
      { to: "/dashboard/projects", label: "Projects", icon: FolderGit2 },
      { to: "/dashboard/achievements", label: "Achievements", icon: Award },
      { to: "/dashboard/challenges", label: "Challenges", icon: Swords },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/dashboard/ai", label: "AI Studio", icon: Sparkles },
      { to: "/dashboard/matcher", label: "Opportunity Matcher", icon: Target },
      { to: "/dashboard/roadmap", label: "Skills roadmap", icon: Route },
      { to: "/dashboard/team", label: "Team finder", icon: UsersRound },
      { to: "/dashboard/share", label: "Share profiles", icon: Share2 },
    ],
  },
  {
    label: "Portfolio",
    items: [
      { to: "/dashboard/integrations", label: "Integrations", icon: Github },
    ],
  },
  {
    label: "Account",
    items: [{ to: "/dashboard/settings", label: "Settings & privacy", icon: Settings }],
  },
] as const;

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
    isActive
      ? "bg-accent font-medium text-accent-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            {group.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={"end" in item ? item.end : false}
                className={navLinkClass}
                onClick={onNavigate}
              >
                <item.icon className="size-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function AccountBlock({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const profile = useQuery(api.profiles.myProfile);
  const publicUrl = profile ? `/p/${profile.slug}` : null;

  return (
    <div className="border-t border-sidebar-border px-3 py-3">
      {publicUrl ? (
        <Button
          variant="outline"
          size="sm"
          className="mb-2 w-full justify-start gap-2"
          asChild
        >
          <a href={publicUrl} target="_blank" rel="noreferrer" onClick={onNavigate}>
            <ExternalLink className="size-3.5" />
            View public profile
          </a>
        </Button>
      ) : profile === null ? (
        <Button
          variant="outline"
          size="sm"
          className="mb-2 w-full justify-start gap-2"
          asChild
        >
          <a href={`/p/${SAMPLE_SLUG}`} target="_blank" rel="noreferrer" onClick={onNavigate}>
            <ExternalLink className="size-3.5" />
            View sample profile
          </a>
        </Button>
      ) : null}
      <div className="flex items-center gap-2.5 px-1.5 py-1.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
          {initials(user?.name || user?.email || "?")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{user?.name || "Signed in"}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {user?.email || "Local account"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-destructive"
          aria-label="Sign out"
          title="Sign out"
          onClick={async () => {
            await signOut();
            navigate("/");
          }}
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Authenticated app chrome: fixed sidebar on desktop, top bar + sheet on
 * mobile, and the outlet every dashboard page renders inside.
 */
export default function AppShell() {
  const profile = useQuery(api.profiles.myProfile);
  const ensureProfile = useMutation(api.profiles.ensureProfile);
  const ensured = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (profile === null && !ensured.current) {
      ensured.current = true;
      ensureProfile().catch((error) => {
        console.error("Could not create profile:", error);
        ensured.current = false;
      });
    }
  }, [profile, ensureProfile]);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <Brand />
          </NavLink>
        </div>
        <NavList />
        <AccountBlock />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur lg:hidden">
        <NavLink to="/dashboard" className="flex items-center gap-2">
          <BrandMark className="size-7 text-primary" />
          <span className="text-sm font-semibold tracking-tight">
            LinkSphere<span className="text-primary"> AI</span>
          </span>
        </NavLink>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col bg-sidebar p-0">
              <SheetHeader className="border-b border-sidebar-border px-5 py-4">
                <SheetTitle className="flex items-center gap-2">
                  <Brand />
                </SheetTitle>
              </SheetHeader>
              <NavList onNavigate={() => setMenuOpen(false)} />
              <AccountBlock onNavigate={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Content */}
      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {profile === undefined ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

    </div>
  );
}
