import type { LinkProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
	Building2,
	Home,
	LayoutDashboard,
	type LucideIcon,
	User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

interface NavigationItem {
	to: string;
	label: string;
	icon: LucideIcon;
	requiresAuth: boolean;
	preload?: LinkProps["preload"];
}

const navigation: NavigationItem[] = [
	{
		to: "/",
		label: "Home",
		icon: Home,
		requiresAuth: false,
		preload: "intent",
	},
	{
		to: "/dashboard",
		label: "Dashboard",
		icon: LayoutDashboard,
		requiresAuth: true,
		preload: false,
	},
	{
		to: "/profile",
		label: "Profile",
		icon: User,
		requiresAuth: true,
		preload: false,
	},
	{
		to: "/listings",
		label: "Listings",
		icon: Building2,
		requiresAuth: true,
		preload: false,
	},
] as const;

export default function Header() {
	const { data: session, isPending } = authClient.useSession();

	const isAuthenticated = session && !isPending;

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">
				<nav className="flex items-center gap-2">
					{navigation.map(
						({ to, label, icon: Icon, requiresAuth, preload }) => {
							if (requiresAuth && !isAuthenticated) return null;

							return (
								<Button key={to} variant="ghost" size="sm" asChild>
									<Link
										to={to}
										className="flex items-center gap-2"
										preload={preload}
									>
										<Icon className="h-4 w-4" />
										<span className="hidden sm:inline">{label}</span>
									</Link>
								</Button>
							);
						},
					)}
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
