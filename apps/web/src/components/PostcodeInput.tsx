import {useQuery} from "@tanstack/react-query";
import {CheckCircle, Loader2, MapPin, XCircle} from "lucide-react";
import {useEffect, useState} from "react";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {trpc} from "@/utils/trpc";

export interface PostcodeData {
	postcode: string;
	admin_district: string;
	admin_ward: string;
	region: string;
	outcode: string;
	incode: string;
}

interface PostcodeInputProps {
	initialPostcode?: string;
	onPostcodeChange: (postcode: string) => void;
	onLocationUpdate: (data: {
		city: string;
		location: string;
		postcodeOutcode: string;
		postcodeIncode: string;
	}) => void;
	onValidationChange?: (isValid: boolean) => void;
	disabled?: boolean;
	error?: string;
}

function usePostcodeLookup() {
	const [postcode, setPostcode] = useState("");
	const [debouncedPostcode, setDebouncedPostcode] = useState("");
	const [isValidating, setIsValidating] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedPostcode(postcode);
		}, 500);

		return () => clearTimeout(timer);
	}, [postcode]);

	const postcodeQuery = useQuery({
		...trpc.postcodes.lookup.queryOptions({ postcode: debouncedPostcode }),
		enabled: !!debouncedPostcode && debouncedPostcode.length >= 5,
		retry: false,
		refetchOnWindowFocus: false,
	});

	useEffect(() => {
		if (debouncedPostcode && debouncedPostcode.length >= 5) {
			setIsValidating(true);
		} else {
			setIsValidating(false);
		}
	}, [debouncedPostcode]);

	return {
		postcode,
		setPostcode,
		isValidating: isValidating && postcodeQuery.isFetching,
		postcodeData: postcodeQuery.data,
		postcodeError: postcodeQuery.error,
		isSuccess: !!postcodeQuery.data && !postcodeQuery.error,
		isError: !!postcodeQuery.error,
	};
}

export function PostcodeInput({
	initialPostcode = "",
	onPostcodeChange,
	onLocationUpdate,
	onValidationChange,
	disabled = false,
	error,
}: PostcodeInputProps) {
	const {
		postcode,
		setPostcode,
		isValidating,
		postcodeData,
		postcodeError,
		isSuccess,
		isError,
	} = usePostcodeLookup();

	useEffect(() => {
		if (initialPostcode) {
			setPostcode(initialPostcode);
		}
	}, [initialPostcode]);

	useEffect(() => {
		onPostcodeChange(postcode);
	}, [postcode, onPostcodeChange]);

	useEffect(() => {
		if (postcodeData) {
			onLocationUpdate({
				city: postcodeData.admin_district,
				location: postcodeData.admin_ward,
				postcodeOutcode: postcodeData.outcode,
				postcodeIncode: postcodeData.incode,
			});
		}
	}, [postcodeData, onLocationUpdate]);

	useEffect(() => {
		if (onValidationChange) {
			onValidationChange(isSuccess);
		}
	}, [isSuccess, onValidationChange]);

	return (
		<>
			<div>
				<Label htmlFor="postcode">Postcode</Label>
				<div className="relative">
					<Input
						id="postcode"
						name="postcode"
						value={postcode}
						onChange={(e) => {
							const upperValue = e.target.value.toUpperCase();
							setPostcode(upperValue);
						}}
						placeholder="Enter postcode (e.g., SW1A 1AA)"
						disabled={disabled}
						className="pr-10"
					/>
					<div className="absolute inset-y-0 right-0 flex items-center pr-3">
						{isValidating && (
							<Loader2 className="h-4 w-4 animate-spin text-gray-400" />
						)}
						{isSuccess && !isValidating && (
							<CheckCircle className="h-4 w-4 text-green-500" />
						)}
						{isError && !isValidating && (
							<XCircle className="h-4 w-4 text-red-500" />
						)}
					</div>
				</div>
				{error && <div className="mt-1 text-red-500 text-sm">{error}</div>}
				{isError && postcodeError && (
					<div className="mt-1 text-red-500 text-sm">
						{postcodeError.message}
					</div>
				)}
			</div>

			{isSuccess && postcodeData && (
				<div className="rounded-lg border border-green-200 bg-green-50 p-4">
					<div className="mb-2 flex items-center gap-2">
						<MapPin className="h-4 w-4 text-green-600" />
						<span className="font-medium text-green-800 text-sm">
							Location Details
						</span>
					</div>
					<div className="grid gap-2 text-green-700 text-sm">
						<div className="flex justify-between">
							<span>Postcode:</span>
							<span className="font-medium">{postcodeData.postcode}</span>
						</div>
						<div className="flex justify-between">
							<span>City:</span>
							<span className="font-medium">{postcodeData.admin_district}</span>
						</div>
						<div className="flex justify-between">
							<span>Location:</span>
							<span className="font-medium">{postcodeData.admin_ward}</span>
						</div>
						<div className="flex justify-between">
							<span>Region:</span>
							<span className="font-medium">{postcodeData.region}</span>
						</div>
						<div className="flex justify-between">
							<span>Outcode:</span>
							<span className="font-medium">{postcodeData.outcode}</span>
						</div>
						<div className="flex justify-between">
							<span>Incode:</span>
							<span className="font-medium">{postcodeData.incode}</span>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
