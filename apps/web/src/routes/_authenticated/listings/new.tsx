import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { ListingForm, type ListingFormData } from "@/components/ListingForm";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/listings/new")({
	component: NewListingRoute,
});

function NewListingRoute() {
	const { data: session, isPending } = authClient.useSession();
	const navigate = Route.useNavigate();

	useEffect(() => {
		if (!session && !isPending) {
			navigate({
				to: "/login",
			})
		}
	}, [session, isPending]);

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
	)

	const handleSubmit = async ({
		formData,
		newFiles,
	}: {
		formData: ListingFormData;
		newFiles: { name: string; type: string; data: string; main: boolean }[];
	}) => {
		await createMutation.mutateAsync({
			...formData,
			files: newFiles.length > 0 ? newFiles : undefined,
		})
	}

	const handleCancel = () => {
		navigate({ to: "/listings" });
	}

	return (
		<div className="mx-auto w-full max-w-4xl py-10">
			<Card>
				<CardHeader>
					<CardTitle>Create New Listing</CardTitle>
					<CardDescription>Add a new listing to the board</CardDescription>
				</CardHeader>
				<CardContent>
					<ListingForm
						onSubmit={handleSubmit}
						onCancel={handleCancel}
						submitButtonText="Create Listing"
						isSubmitting={createMutation.isPending}
						mode="create"
					/>
				</CardContent>
			</Card>
		</div>
	)
}
