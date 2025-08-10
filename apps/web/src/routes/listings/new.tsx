import { useForm } from "@tanstack/react-form";
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

interface Listing {
	title: string;
	description: string;
	location: string;
	phone: string;
}

const defaultListing: Listing = {
	title: "",
	description: "",
	location: "",
	phone: "",
};

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

	const form = useForm({
		defaultValues: defaultListing,
		onSubmit: async ({ formApi, value }) => {
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
				...value,
				files: fileData.length > 0 ? fileData : undefined,
			});

			formApi.reset();
		},
	});

	return (
		<div className="mx-auto w-full max-w-md py-10">
			<Card>
				<CardHeader>
					<CardTitle>Create New Listing</CardTitle>
					<CardDescription>Add a new listing to the board</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-4"
					>
						<form.Field
							name="title"
							validators={{
								onChange: ({ value }) =>
									!value ? "Title is required" : undefined,
							}}
						>
							{(field) => (
								<div>
									<Label htmlFor={field.name}>Title</Label>
									<Input
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="Enter listing title..."
										disabled={createMutation.isPending}
									/>
									{field.state.meta.errors ? (
										<div className="mt-1 text-red-500 text-sm">
											{field.state.meta.errors[0]}
										</div>
									) : null}
								</div>
							)}
						</form.Field>

						<form.Field
							name="description"
							validators={{
								onChange: ({ value }) =>
									!value ? "Description is required" : undefined,
							}}
						>
							{(field) => (
								<div>
									<Label htmlFor={field.name}>Description</Label>
									<Textarea
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="Enter listing description..."
										disabled={createMutation.isPending}
									/>
									{field.state.meta.errors ? (
										<div className="mt-1 text-red-500 text-sm">
											{field.state.meta.errors[0]}
										</div>
									) : null}
								</div>
							)}
						</form.Field>

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

						<form.Field
							name="location"
							validators={{
								onChange: ({ value }) =>
									!value ? "Location is required" : undefined,
							}}
						>
							{(field) => (
								<div>
									<Label htmlFor={field.name}>Location</Label>
									<Input
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="Enter location..."
										disabled={createMutation.isPending}
									/>
									{field.state.meta.errors ? (
										<div className="mt-1 text-red-500 text-sm">
											{field.state.meta.errors[0]}
										</div>
									) : null}
								</div>
							)}
						</form.Field>

						<form.Field
							name="phone"
							validators={{
								onChange: ({ value }) => {
									if (!value) return "Phone is required";
									if (!value.startsWith("+44"))
										return "Phone must start with +44";
									if (value.length !== 13)
										return "Phone must be 13 characters long";
									return undefined;
								},
							}}
						>
							{(field) => (
								<div>
									<Label htmlFor={field.name}>Phone</Label>
									<Input
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="+44"
										disabled={createMutation.isPending}
									/>
									{field.state.meta.errors ? (
										<div className="mt-1 text-red-500 text-sm">
											{field.state.meta.errors[0]}
										</div>
									) : null}
								</div>
							)}
						</form.Field>

						<div className="flex space-x-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => navigate({ to: "/listings" })}
								disabled={createMutation.isPending}
							>
								Cancel
							</Button>
							<form.Subscribe
								selector={(state) => [state.canSubmit, state.isSubmitting]}
							>
								{([canSubmit, isSubmitting]) => (
									<Button
										type="submit"
										disabled={!canSubmit || createMutation.isPending}
									>
										{createMutation.isPending || isSubmitting ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											"Create Listing"
										)}
									</Button>
								)}
							</form.Subscribe>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
