import { boolean, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";
import { listing } from "@/db/schema/listing";

export const image = pgTable("image", {
	id: uuid("id").primaryKey().defaultRandom(),
	url: text("url").notNull(),
	deleted: boolean("deleted").default(false),
	listingId: uuid("listing_id").references(() => listing.id, {
		onDelete: "set null",
	}),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});
