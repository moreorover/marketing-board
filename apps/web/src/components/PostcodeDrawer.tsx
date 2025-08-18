import {MapPin} from "lucide-react";
import {useCallback, useState} from "react";
import {PostcodeInput} from "@/components/PostcodeInput";
import {Button} from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {useMediaQuery} from "@/hooks/use-media-query";

interface PostcodeDrawerProps {
	onLocationUpdate: (data: {
		city: string;
		location: string;
		postcodeOutcode: string;
		postcodeIncode: string;
	}) => void;
	disabled?: boolean;
	triggerText?: string;
	initialPostcode?: string;
}

export function PostcodeDrawer({
	onLocationUpdate,
	disabled = false,
	triggerText = "Enter Postcode",
	initialPostcode = "",
}: PostcodeDrawerProps) {
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const [isOpen, setIsOpen] = useState(false);
	const [locationData, setLocationData] = useState<{
		city: string;
		location: string;
		postcodeOutcode: string;
		postcodeIncode: string;
	} | null>(null);

	const handleUpdate = useCallback(
		(
			data: {
				city: string;
				location: string;
				postcodeOutcode: string;
				postcodeIncode: string;
			} | null,
		) => {
			setLocationData(data);
		},
		[],
	);

	const handleSubmit = useCallback(() => {
		if (locationData) {
			onLocationUpdate(locationData);
			setIsOpen(false);
		}
	}, [locationData, onLocationUpdate]);

	if (isDesktop) {
		return (
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogTrigger asChild>
					<Button variant="outline" disabled={disabled} className="gap-2">
						<MapPin className="h-4 w-4" />
						{triggerText}
					</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Enter Your Postcode</DialogTitle>
						<DialogDescription>
							Enter your postcode to automatically fill in location details.
						</DialogDescription>
					</DialogHeader>
					<div className="px-4">
						<PostcodeInput
							initialPostcode={initialPostcode}
							onUpdate={handleUpdate}
							disabled={disabled}
						/>
					</div>
					<DialogFooter>
						<Button
							onClick={handleSubmit}
							disabled={!locationData}
							// className="w-full"
						>
							Use This Postcode
						</Button>
						<DialogClose asChild>
							<Button variant="outline">Cancel</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Drawer open={isOpen} onOpenChange={setIsOpen}>
			<DrawerTrigger asChild>
				<Button variant="outline" disabled={disabled} className="gap-2">
					<MapPin className="h-4 w-4" />
					{triggerText}
				</Button>
			</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Enter Your Postcode</DrawerTitle>
					<DrawerDescription>
						Enter your postcode to automatically fill in location details.
					</DrawerDescription>
				</DrawerHeader>
				<div className="px-4">
					<PostcodeInput
						initialPostcode={initialPostcode}
						onUpdate={handleUpdate}
						disabled={disabled}
					/>
				</div>
				<DrawerFooter>
					<Button
						onClick={handleSubmit}
						disabled={!locationData}
						className="w-full"
					>
						Use This Postcode
					</Button>
					<DrawerClose asChild>
						<Button variant="outline" className="w-full">
							Cancel
						</Button>
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
