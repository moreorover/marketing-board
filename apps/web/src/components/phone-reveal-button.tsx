import { useMutation } from "@tanstack/react-query";
import { Loader2, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/utils/trpc";

interface PhoneRevealButtonProps {
	listingId: string;
}

export function PhoneRevealButton({ listingId }: PhoneRevealButtonProps) {
	const [phoneRevealed, setPhoneRevealed] = useState(false);
	const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

	// Reveal phone mutation
	const revealPhoneMutation = useMutation(
		trpc.listing.revealPhone.mutationOptions({
			onSuccess: (data) => {
				setPhoneNumber(data.phone);
				setPhoneRevealed(true);
				toast.success("Phone number revealed!");
			},
			onError: (error) => {
				toast.error("Failed to reveal phone number");
				console.error("Phone reveal error:", error);
			},
		}),
	);

	const handleRevealPhone = async () => {
		revealPhoneMutation.mutate({
			listingId,
		});
	};

	if (phoneRevealed && phoneNumber) {
		return (
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 text-lg">
						<Phone className="h-5 w-5 text-green-600" />
						Contact Phone
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between">
						<a
							href={`tel:${phoneNumber}`}
							className="font-bold text-2xl text-green-600 transition-colors hover:text-green-700"
						>
							{phoneNumber}
						</a>
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								navigator.clipboard.writeText(phoneNumber);
								toast.success("Phone number copied to clipboard!");
							}}
						>
							Copy
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-lg">
					<Phone className="h-5 w-5" />
					Contact Information
				</CardTitle>
				<CardDescription>
					Click to reveal the phone number for this listing
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Button
					onClick={handleRevealPhone}
					disabled={revealPhoneMutation.isPending}
					className="w-full"
					size="lg"
				>
					{revealPhoneMutation.isPending ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Revealing...
						</>
					) : (
						<>
							<Phone className="mr-2 h-4 w-4" />
							Show Phone Number
						</>
					)}
				</Button>
			</CardContent>
		</Card>
	);
}
