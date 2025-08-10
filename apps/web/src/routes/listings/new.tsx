import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";
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

const FormSchema = z.object({
	title: z.string().min(1),
	description: z.string().min(1),
	location: z.string().min(1),
	phone: z.string().startsWith("+44").min(13).max(13),
	files: z
		.array(
			z.object({
				name: z.string(),
				type: z.string(),
				data: z.string(),
			}),
		)
		.optional(),
});

type FormData = z.infer<typeof FormSchema>;

const defaultValues: FormData = {
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
		defaultValues,
		validators: { onChange: FormSchema },
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
						<form.Field name="title">
							{({ name, state, handleChange, handleBlur }) => (
								<div>
									<Label htmlFor={name}>Title</Label>
									<Input
										id={name}
										name={name}
										value={state.value}
										onBlur={handleBlur}
										onChange={(e) => handleChange(e.target.value)}
										placeholder="Enter listing title..."
										disabled={createMutation.isPending}
									/>
									{state.meta.errors.length > 0 && state.meta.isTouched && (
										<div className="mt-1 text-red-500 text-sm">
											{state.meta.errors[0]?.message}
										</div>
									)}
								</div>
							)}
						</form.Field>

						<form.Field name="description">
							{({ name, state, handleChange, handleBlur }) => (
								<div>
									<Label htmlFor={name}>Description</Label>
									<Textarea
										id={name}
										name={name}
										value={state.value}
										onBlur={handleBlur}
										onChange={(e) => handleChange(e.target.value)}
										placeholder="Enter listing description..."
										disabled={createMutation.isPending}
									/>
									{state.meta.errors.length > 0 && state.meta.isTouched && (
										<div className="mt-1 text-red-500 text-sm">
											{state.meta.errors[0]?.message}
										</div>
									)}
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

						<form.Field name="location">
							{({ name, state, handleChange, handleBlur }) => (
								<div>
									<Label htmlFor={name}>Location</Label>
									<Input
										id={name}
										name={name}
										value={state.value}
										onBlur={handleBlur}
										onChange={(e) => handleChange(e.target.value)}
										placeholder="Enter location..."
										disabled={createMutation.isPending}
									/>
									{state.meta.errors.length > 0 && state.meta.isTouched && (
										<div className="mt-1 text-red-500 text-sm">
											{state.meta.errors[0]?.message}
										</div>
									)}
								</div>
							)}
						</form.Field>

						<form.Field name="phone">
							{({ name, state, handleChange, handleBlur }) => (
								<div>
									<Label htmlFor={name}>Phone</Label>
									<Input
										id={name}
										name={name}
										value={state.value}
										onBlur={handleBlur}
										onChange={(e) => handleChange(e.target.value)}
										placeholder="+44"
										disabled={createMutation.isPending}
									/>
									{state.meta.errors.length > 0 && state.meta.isTouched && (
										<div className="mt-1 text-red-500 text-sm">
											{state.meta.errors[0]?.message}
										</div>
									)}
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
