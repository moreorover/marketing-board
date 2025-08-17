import {useCallback, useState} from "react";
import {MapPin} from "lucide-react";
import {Button} from "@/components/ui/button";
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
import {PostcodeInput} from "@/components/PostcodeInput";

interface PostcodeDrawerProps {
	onLocationUpdate: (data: {city: string; location: string; postcode: string}) => void;
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
	const [postcode, setPostcode] = useState(initialPostcode);
	const [isOpen, setIsOpen] = useState(false);
	const [locationData, setLocationData] = useState<{city: string; location: string} | null>(null);
	const [isValid, setIsValid] = useState(false);

	const handleLocationUpdate = useCallback((data: {city: string; location: string}) => {
		setLocationData(data);
	}, []);

	const handlePostcodeChange = useCallback((newPostcode: string) => {
		setPostcode(newPostcode);
	}, []);

	const handleValidationChange = useCallback((isValidPostcode: boolean) => {
		setIsValid(isValidPostcode);
	}, []);

	const handleSubmit = useCallback(() => {
		if (locationData && postcode) {
			onLocationUpdate({
				...locationData,
				postcode: postcode,
			});
			setIsOpen(false);
		}
	}, [locationData, postcode, onLocationUpdate]);

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
						onPostcodeChange={handlePostcodeChange}
						onLocationUpdate={handleLocationUpdate}
						onValidationChange={handleValidationChange}
						disabled={disabled}
					/>
				</div>
				<DrawerFooter>
					<Button 
						onClick={handleSubmit} 
						disabled={!isValid || !locationData || !postcode}
						className="w-full"
					>
						Use This Postcode
					</Button>
					<DrawerClose asChild>
						<Button variant="outline" className="w-full">Cancel</Button>
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}