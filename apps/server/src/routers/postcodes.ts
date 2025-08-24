import {TRPCError} from "@trpc/server";
import {z} from "zod";
import {protectedProcedure, publicProcedure, router} from "../lib/trpc"; // Zod schemas for validation and type safety

// Zod schemas for validation and type safety
const PostcodeDataSchema = z.object({
	postcode: z.string(),
	quality: z.number(),
	eastings: z.number(),
	northings: z.number(),
	country: z.string(),
	nhs_ha: z.string().nullable(),
	longitude: z.number(),
	latitude: z.number(),
	european_electoral_region: z.string().nullable(),
	primary_care_trust: z.string().nullable(),
	region: z.string().nullable(),
	lsoa: z.string(),
	msoa: z.string(),
	incode: z.string(),
	outcode: z.string(),
	parliamentary_constituency: z.string(),
	admin_district: z.string(),
	parish: z.string().nullable(),
	admin_county: z.string().nullable(),
	admin_ward: z.string(),
	ced: z.string().nullable(),
	ccg: z.string(),
	nuts: z.string(),
	codes: z.object({
		admin_district: z.string(),
		admin_county: z.string().nullable(),
		admin_ward: z.string(),
		parish: z.string().nullable(),
		parliamentary_constituency: z.string(),
		ccg: z.string(),
		ccg_id: z.string(),
		ced: z.string().nullable(),
		nuts: z.string(),
		lsoa: z.string(),
		msoa: z.string(),
		lau2: z.string(),
	}),
});

const RandomPostcodeResponseSchema = z.object({
	status: z.number(),
	result: PostcodeDataSchema,
});

const PostcodeErrorSchema = z.object({
	status: z.number(),
	error: z.string(),
});

// Type inference from schemas
type PostcodeData = z.infer<typeof PostcodeDataSchema>;
type RandomPostcodeResponse = z.infer<typeof RandomPostcodeResponseSchema>;
type PostcodeError = z.infer<typeof PostcodeErrorSchema>;

/**
 * Fetches a random postcode with comprehensive error handling
 */
async function fetchRandomPostcode(): Promise<PostcodeData> {
	const POSTCODES_URL = process.env.POSTCODES_URL;

	if (!POSTCODES_URL) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "POSTCODES_URL environment variable is not configured",
		});
	}

	try {
		const response = await fetch(`${POSTCODES_URL}/random/postcodes`, {
			method: "GET",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			signal: AbortSignal.timeout(5000), // 5 second timeout
		});

		if (!response.ok) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Postcodes API returned ${response.status}: ${response.statusText}`,
			});
		}

		const rawData = await response.json();

		// Try to parse as error response first
		const errorResult = PostcodeErrorSchema.safeParse(rawData);
		if (errorResult.success) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Postcodes API error: ${errorResult.data.error}`,
			});
		}

		// Parse as successful response
		const successResult = RandomPostcodeResponseSchema.safeParse(rawData);
		if (!successResult.success) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Invalid response format from postcodes API",
				cause: successResult.error,
			});
		}

		return successResult.data.result;
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error; // Re-throw TRPCErrors as-is
		}

		if (error instanceof Error) {
			// Handle different types of network errors
			if (error.name === "AbortError") {
				throw new TRPCError({
					code: "TIMEOUT",
					message: "Request to postcodes API timed out",
				});
			}

			if (
				error.message.includes("Failed to fetch") ||
				error.message.includes("ECONNREFUSED")
			) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						"Cannot connect to postcodes API. Please check if the service is running.",
				});
			}

			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Network error: ${error.message}`,
			});
		}

		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Unknown error occurred while fetching postcode",
		});
	}
}

/**
 * Fetches postcode details by postcode string
 */
async function fetchPostcodeLookup(postcode: string): Promise<PostcodeData> {
	const POSTCODES_URL = process.env.POSTCODES_URL;

	if (!POSTCODES_URL) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "POSTCODES_URL environment variable is not configured",
		});
	}

	// Clean and validate postcode format
	const cleanPostcode = postcode.trim().toUpperCase().replace(/\s+/g, "");

	if (!cleanPostcode) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Postcode cannot be empty",
		});
	}

	// Basic UK postcode format validation
	const postcodeRegex = /^[A-Z]{1,2}[0-9R][0-9A-Z]?[0-9][ABD-HJLNP-UW-Z]{2}$/;
	if (!postcodeRegex.test(cleanPostcode)) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Invalid UK postcode format",
		});
	}

	try {
		const response = await fetch(
			`${POSTCODES_URL}/postcodes/${encodeURIComponent(cleanPostcode)}`,
			{
				method: "GET",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				signal: AbortSignal.timeout(5000),
			},
		);

		const rawData = await response.json();

		// Handle 404 - postcode not found
		if (response.status === 404) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Postcode '${postcode}' not found`,
			});
		}

		if (!response.ok) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Postcodes API returned ${response.status}: ${response.statusText}`,
			});
		}

		// Try to parse as error response first
		const errorResult = PostcodeErrorSchema.safeParse(rawData);
		if (errorResult.success) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Postcodes API error: ${errorResult.data.error}`,
			});
		}

		// Parse as successful response
		const successResult = RandomPostcodeResponseSchema.safeParse(rawData);
		if (!successResult.success) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Invalid response format from postcodes API",
				cause: successResult.error,
			});
		}

		return successResult.data.result;
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}

		if (error instanceof Error) {
			if (error.name === "AbortError") {
				throw new TRPCError({
					code: "TIMEOUT",
					message: "Request to postcodes API timed out",
				});
			}

			if (
				error.message.includes("Failed to fetch") ||
				error.message.includes("ECONNREFUSED")
			) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						"Cannot connect to postcodes API. Please check if the service is running.",
				});
			}

			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Network error: ${error.message}`,
			});
		}

		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Unknown error occurred while looking up postcode",
		});
	}
}
/**
 * Simple health check for the postcodes API
 */
async function checkPostcodesApiHealth(): Promise<{
	status: "healthy" | "unhealthy";
	responseTime: number;
	timestamp: string;
	apiUrl: string;
	error?: string;
}> {
	const POSTCODES_URL = process.env.POSTCODES_URL;
	const startTime = Date.now();

	if (!POSTCODES_URL) {
		return {
			status: "unhealthy",
			responseTime: 0,
			timestamp: new Date().toISOString(),
			apiUrl: "Not configured",
			error: "POSTCODES_URL environment variable is not configured",
		};
	}

	try {
		const response = await fetch(`${POSTCODES_URL}/random/postcodes`, {
			method: "GET",
			headers: {
				Accept: "application/json",
			},
			signal: AbortSignal.timeout(5000),
		});

		const responseTime = Date.now() - startTime;

		if (response.ok) {
			return {
				status: "healthy",
				responseTime,
				timestamp: new Date().toISOString(),
				apiUrl: POSTCODES_URL,
			};
		}
		return {
			status: "unhealthy",
			responseTime,
			timestamp: new Date().toISOString(),
			apiUrl: POSTCODES_URL,
			error: `API returned ${response.status}: ${response.statusText}`,
		};
	} catch (error) {
		const responseTime = Date.now() - startTime;

		return {
			status: "unhealthy",
			responseTime,
			timestamp: new Date().toISOString(),
			apiUrl: POSTCODES_URL,
			error: error instanceof Error ? error.message : "Unknown error occurred",
		};
	}
}

export const postcodesRouter = router({
	/**
	 * Health check for the postcodes API
	 */
	healthCheck: publicProcedure.query(async () => {
		return await checkPostcodesApiHealth();
	}),

	/**
	 * Simple health status check (returns boolean for quick checks)
	 */
	isHealthy: publicProcedure.query(async (): Promise<boolean> => {
		try {
			const health = await checkPostcodesApiHealth();
			return health.status === "healthy";
		} catch {
			return false;
		}
	}),

	/**
	 * Get a random UK postcode
	 */
	getRandom: protectedProcedure.query(async (): Promise<PostcodeData> => {
		return await fetchRandomPostcode();
	}),

	/**
	 * Lookup a specific postcode
	 */
	lookup: protectedProcedure
		.input(
			z.object({
				postcode: z
					.string()
					.min(1, "Postcode is required")
					.max(10, "Postcode too long"),
			}),
		)
		.query(async ({ input }): Promise<PostcodeData> => {
			return await fetchPostcodeLookup(input.postcode);
		}),

	/**
	 * Validate if a postcode exists (returns boolean)
	 */
	validate: protectedProcedure
		.input(
			z.object({
				postcode: z
					.string()
					.min(1, "Postcode is required")
					.max(10, "Postcode too long"),
			}),
		)
		.query(
			async ({ input }): Promise<{ postcode: string; isValid: boolean }> => {
				try {
					await fetchPostcodeLookup(input.postcode);
					return { postcode: input.postcode, isValid: true };
				} catch (error) {
					if (error instanceof TRPCError && error.code === "NOT_FOUND") {
						return { postcode: input.postcode, isValid: false };
					}
					// Re-throw other errors (network issues, etc.)
					throw error;
				}
			},
		),
});
