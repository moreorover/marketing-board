import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";
import { listing } from "@/db/schema/listing";

export const phoneView = pgTable("phone_view", {
	id: uuid("id").primaryKey().defaultRandom(),
	listingId: uuid("listing_id")
		.notNull()
		.references(() => listing.id, { onDelete: "cascade" }),
	userId: text("user_id").references(() => user.id, { onDelete: "cascade" }), // Can be null for anonymous views
	viewedAt: timestamp("viewed_at").notNull().defaultNow(),
	ipAddress: text("ip_address"), // Required IP address for tracking
});
