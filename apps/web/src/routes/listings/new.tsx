import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dropzone,
	DropzoneContent,
	DropzoneEmptyState,
} from "@/components/ui/shadcn-io/dropzone";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/listings/new")({
	component: NewListingRoute,
});

function NewListingRoute() {
	const { data: session, isPending } = authClient.useSession();

	const navigate = Route.useNavigate();

	useEffect(() => {
		if (!session && !isPending) {
			navigate({
				to: "/login",
			});
		}
	}, [session, isPending]);

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [location, setLocation] = useState("");
	const [phone, setPhone] = useState("");

	const [files, setFiles] = useState<File[] | undefined>();
	const handleDrop = (files: File[]) => {
		console.log(files);
		setFiles(files);
	};

	const createMutation = useMutation(
		trpc.listing.create.mutationOptions({
			onSuccess: () => {
				toast.success("Listing created successfully!");
				navigate({ to: "/listings" });
			},
			onError: () => {
				toast.error("Failed to create listing.");
			},
		}),
	);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (title.trim() && description.trim() && location.trim()) {
			let fileData: { name: string; type: string; data: string }[] = [];

			if (files && files.length > 0) {
				fileData = await Promise.all(
					files.map(async (file) => {
						return new Promise<{ name: string; type: string; data: string }>(
							(resolve) => {
								const reader = new FileReader();
								reader.onloadend = () => {
									const base64String = (reader.result as string).split(",")[1];
									resolve({
										name: file.name,
										type: file.type,
										data: base64String,
									});
								};
								reader.readAsDataURL(file);
							},
						);
					}),
				);
			}

			createMutation.mutate({
				title,
				description,
				location,
				phone,
				files: fileData.length > 0 ? fileData : undefined,
			});
		}
	};

	return (
		<div className="mx-auto w-full max-w-md py-10">
			<Card>
				<CardHeader>
					<CardTitle>Create New Listing</CardTitle>
					<CardDescription>Add a new listing to the board</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<Label htmlFor="title">Title</Label>
							<Input
								id="title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Enter listing title..."
								disabled={createMutation.isPending}
								required
							/>
						</div>

						<div>
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Enter listing description..."
								disabled={createMutation.isPending}
								required
							/>
						</div>

						<div>
							<Dropzone
								maxFiles={3}
								onDrop={handleDrop}
								onError={console.error}
								src={files}
							>
								<DropzoneEmptyState />
								<DropzoneContent />
							</Dropzone>
						</div>

						<div>
							<Label htmlFor="location">Location</Label>
							<Input
								id="location"
								value={location}
								onChange={(e) => setLocation(e.target.value)}
								placeholder="Enter location..."
								disabled={createMutation.isPending}
								required
							/>
						</div>

						<div>
							<Label htmlFor="phone">Phone</Label>
							<Input
								id="phone"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								placeholder="+44"
								disabled={createMutation.isPending}
								required
							/>
						</div>

						<div className="flex space-x-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => navigate({ to: "/listings" })}
								disabled={createMutation.isPending}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={
									createMutation.isPending ||
									!title.trim() ||
									!description.trim() ||
									!location.trim()
								}
							>
								{createMutation.isPending ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									"Create Listing"
								)}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
