import { Link } from "@tanstack/react-router";
import { Home, LayoutDashboard, User, Building2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const navigation = [
	{ to: "/", label: "Home", icon: Home, requiresAuth: false },
	{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, requiresAuth: true },
	{ to: "/profile", label: "Profile", icon: User, requiresAuth: true },
	{ to: "/listings", label: "Listings", icon: Building2, requiresAuth: true },
] as const;

export default function Header() {
	const { data: session, isPending } = authClient.useSession();

	const isAuthenticated = session && !isPending;

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">
				<nav className="flex items-center gap-2">
					{navigation.map(({ to, label, icon: Icon, requiresAuth }) => {
						if (requiresAuth && !isAuthenticated) return null;
						
						return (
							<Button key={to} variant="ghost" size="sm" asChild>
								<Link to={to} className="flex items-center gap-2">
									<Icon className="h-4 w-4" />
									<span className="hidden sm:inline">{label}</span>
								</Link>
							</Button>
						);
					})}
				</nav>
				
				<div className="flex items-center gap-2">
					<ModeToggle />
					<Separator orientation="vertical" className="h-6" />
					<UserMenu />
				</div>
			</div>
		</header>
	);
}
