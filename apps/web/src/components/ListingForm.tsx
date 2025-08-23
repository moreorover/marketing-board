import {useForm} from "@tanstack/react-form";
import {Loader2} from "lucide-react";
import {useCallback} from "react";
import z from "zod";
import {PhotoManager} from "@/components/PhotoManager";
import {PostcodeDrawer} from "@/components/PostcodeDrawer";
import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";

const defaultPricingTemplate = [
	{ duration: "15 minutes", price: 0 },
	{ duration: "30 minutes", price: 0 },
	{ duration: "1 hours", price: 0 },
	{ duration: "2 hours", price: 0 },
	{ duration: "3 hours", price: 0 },
	{ duration: "24 hours", price: 0 },
];

function mergePricingWithTemplate(
	inputPricing: { duration: string; price: number }[] | undefined,
) {
	return inputPricing
		? defaultPricingTemplate.map((template) => {
				// Find matching duration in input array
				const inputItem = inputPricing.find(
					(item) => item.duration === template.duration,
				);

				return {
					...template,
					price: inputItem ? inputItem.price : template.price,
				};
			})
		: defaultPricingTemplate;
}

const FormSchema = z.object({
	title: z.string().min(1),
	description: z.string().min(1),
	location: z.string().min(1), // Will be auto-filled from admin_ward
	phone: z.string().startsWith("+44").min(13).max(13),
	city: z.string().min(1), // Will be auto-filled from admin_district
	postcodeOutcode: z.string().min(1), // Will be auto-filled from outcode
	postcodeIncode: z.string().min(1), // Will be auto-filled from incode
	inCall: z.boolean(),
	outCall: z.boolean(),
	pricing: z.array(
		z.object({
			duration: z.string(),
			price: z.number().min(0),
		}),
	),
});

export type ListingFormData = z.infer<typeof FormSchema>;

interface ListingFormProps {
	photos: {
		id: string;
		isMain: boolean;
		signedUrl: string;
	}[];
	initialData?: Partial<ListingFormData>;
	listingId: string | null;
	onSubmit: (formData: ListingFormData) => void;
	onUpload: () => void;
	onPhotoDelete: () => void;
	onMainPhotoChange: () => void;
	onCancel: () => void;
	submitButtonText: string;
	isSubmitting?: boolean;
}

export function ListingForm({
	photos,
	initialData = {},
	listingId,
	onSubmit,
	onUpload,
	onPhotoDelete,
	onMainPhotoChange,
	onCancel,
	submitButtonText,
	isSubmitting = false,
}: ListingFormProps) {
	const form = useForm({
		defaultValues: {
			title: initialData.title || "",
			description: initialData.description || "",
			location: initialData.location || "",
			phone: initialData.phone || "",
			city: initialData.city || "",
			postcodeOutcode: initialData.postcodeOutcode || "",
			postcodeIncode: initialData.postcodeIncode || "",
			inCall: initialData.inCall || false,
			outCall: initialData.outCall || false,
			pricing: mergePricingWithTemplate(initialData.pricing),
		} as ListingFormData,
		validators: { onChange: FormSchema },
		onSubmit: async ({ value }) => {
			onSubmit(value);
		},
	});

	const handleLocationUpdate = useCallback(
		(data: {
			city: string;
			location: string;
			postcodeOutcode: string;
			postcodeIncode: string;
		}) => {
			form.setFieldValue("city", data.city);
			form.setFieldValue("location", data.location);
			form.setFieldValue("postcodeOutcode", data.postcodeOutcode);
			form.setFieldValue("postcodeIncode", data.postcodeIncode);
		},
		[form],
	);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-6"
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
							disabled={isSubmitting}
						/>
						{state.meta.errors.length > 0 && state.meta.isTouched && (
							<div className="mt-1 text-red-500 text-sm">
								{state.meta.errors[0]?.message}
							</div>
						)}
					</div>
				)}
			</form.Field>

			{/* Postcode Field with Auto-filled Location Details */}
			<div>
				<Label>Postcode</Label>
				<PostcodeDrawer
					initialPostcode={
						initialData.postcodeOutcode && initialData.postcodeOutcode
							? `${initialData.postcodeOutcode} ${initialData.postcodeIncode}`
							: ""
					}
					onLocationUpdate={handleLocationUpdate}
					disabled={isSubmitting}
					triggerText={"Enter Postcode"}
				/>
			</div>

			<form.Field name="city">
				{({ name, state }) => (
					<div>
						<Label htmlFor={name}>City</Label>
						<Input
							id={name}
							name={name}
							value={state.value}
							placeholder="Auto-filled from postcode"
							disabled={true}
							className="cursor-not-allowed bg-muted text-muted-foreground"
						/>
						{state.value && (
							<div className="mt-1 text-green-600 text-sm">
								Auto-filled: {state.value}
							</div>
						)}
					</div>
				)}
			</form.Field>

			<form.Field name="location">
				{({ name, state }) => (
					<div>
						<Label htmlFor={name}>Location</Label>
						<Input
							id={name}
							name={name}
							value={state.value}
							placeholder="Auto-filled from postcode"
							disabled={true}
							className="cursor-not-allowed bg-muted text-muted-foreground"
						/>
						{state.value && (
							<div className="mt-1 text-green-600 text-sm">
								Auto-filled: {state.value}
							</div>
						)}
					</div>
				)}
			</form.Field>
			<div className="grid gap-4 md:grid-cols-2">
				<form.Field name="postcodeOutcode">
					{({ name, state }) => (
						<div>
							<Label htmlFor={name}>Postcode Outcode</Label>
							<Input
								id={name}
								name={name}
								value={state.value}
								placeholder="Auto-filled from postcode"
								disabled={true}
								className="cursor-not-allowed bg-muted text-muted-foreground"
							/>
							{state.value && (
								<div className="mt-1 text-green-600 text-sm">
									Auto-filled: {state.value}
								</div>
							)}
						</div>
					)}
				</form.Field>
				<form.Field name="postcodeIncode">
					{({ name, state }) => (
						<div>
							<Label htmlFor={name}>Postcode Incode</Label>
							<Input
								id={name}
								name={name}
								value={state.value}
								placeholder="Auto-filled from postcode"
								disabled={true}
								className="cursor-not-allowed bg-muted text-muted-foreground"
							/>
							{state.value && (
								<div className="mt-1 text-green-600 text-sm">
									Auto-filled: {state.value}
								</div>
							)}
						</div>
					)}
				</form.Field>
			</div>

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
							disabled={isSubmitting}
							rows={4}
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
							disabled={isSubmitting}
						/>
						{state.meta.errors.length > 0 && state.meta.isTouched && (
							<div className="mt-1 text-red-500 text-sm">
								{state.meta.errors[0]?.message}
							</div>
						)}
					</div>
				)}
			</form.Field>

			{/* Service Type Checkboxes */}
			<div className="space-y-4">
				<Label>Service Type</Label>
				<div className="flex space-x-6">
					<form.Field name="inCall">
						{({ name, state, handleChange }) => (
							<div className="flex items-center space-x-2">
								<Checkbox
									id={name}
									name={name}
									checked={state.value}
									onCheckedChange={(checked) => handleChange(Boolean(checked))}
									disabled={isSubmitting}
								/>
								<Label htmlFor={name} className="font-normal text-sm">
									In Call
								</Label>
							</div>
						)}
					</form.Field>
					<form.Field name="outCall">
						{({ name, state, handleChange }) => (
							<div className="flex items-center space-x-2">
								<Checkbox
									id={name}
									name={name}
									checked={state.value}
									onCheckedChange={(checked) => handleChange(Boolean(checked))}
									disabled={isSubmitting}
								/>
								<Label htmlFor={name} className="font-normal text-sm">
									Out Call
								</Label>
							</div>
						)}
					</form.Field>
				</div>
			</div>

			{/* Pricing */}
			<div className="rounded-lg">
				<h3 className="mb-4 font-semibold text-lg">Pricing</h3>
				<form.Field name="pricing" mode="array">
					{(field) => (
						<div className="space-y-4">
							{field.state.value.map((item, index) => (
								<div
									key={item.duration}
									className="flex items-center gap-4 rounded-lg border p-3"
								>
									{/* Duration Label */}
									<div className="flex-1">
										<span className="font-medium text-sm">{item.duration}</span>
									</div>

									{/* Price Input */}
									<div className="max-w-xs flex-1">
										<form.Field name={`pricing[${index}].price`}>
											{(priceField) => (
												<div className="relative">
													<span className="-translate-y-1/2 absolute top-1/2 left-3 transform">
														£
													</span>
													<input
														type="number"
														step="5"
														min="0"
														name={priceField.name}
														value={priceField.state.value}
														onBlur={priceField.handleBlur}
														onChange={(e) => {
															const newValue =
																Number.parseFloat(e.target.value) || 0;
															priceField.handleChange(newValue);
														}}
														className="w-full rounded-md border py-2 pr-3 pl-8 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
														placeholder="0.00"
													/>
													{priceField.state.meta.isTouched &&
														priceField.state.meta.errors.length > 0 && (
															<p className="mt-1 text-red-500 text-sm">
																{priceField.state.meta.errors[0]?.message ||
																	"Invalid value"}
															</p>
														)}
												</div>
											)}
										</form.Field>
									</div>
								</div>
							))}

							{field.state.meta.isTouched &&
								field.state.meta.errors.length > 0 && (
									<p className="mt-1 text-red-500 text-sm">
										{field.state.meta.errors[0]?.message || "Invalid value"}
									</p>
								)}
						</div>
					)}
				</form.Field>
			</div>

			<PhotoManager
				photos={photos}
				listingId={listingId}
				onUpload={onUpload}
				onPhotoDelete={onPhotoDelete}
				onMainPhotoChange={onMainPhotoChange}
				isSubmitting={isSubmitting}
			/>

			{/* Photo validation message */}
			{photos.length === 0 && (
				<div className="mt-1 text-red-500 text-sm">
					Please upload at least one photo for your listing.
				</div>
			)}

			{/* Form Actions */}
			<div className="flex space-x-3">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isSubmitting}
				>
					Cancel
				</Button>
				<form.Subscribe
					selector={(state) => [state.canSubmit, state.isSubmitting]}
				>
					{([canSubmit, isFormSubmitting]) => (
						<Button type="submit" disabled={!canSubmit || isSubmitting}>
							{isSubmitting || isFormSubmitting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								submitButtonText
							)}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
