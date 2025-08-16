import {relations} from "drizzle-orm";
import {pgTable, text, uuid} from "drizzle-orm/pg-core";
import {user} from "@/db/schema/auth";
import {listingImage} from "./listing-image";

export const listing = pgTable("listing", {
	id: uuid("id").primaryKey().defaultRandom(),
	title: text("title").notNull(),
	description: text("description").notNull(),
	location: text("location").notNull(),
	city: text("city").notNull(),
	postcode: text("postcode").notNull(),
	phone: text("phone").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const listingRelations = relations(listing, ({ many }) => ({
	images: many(listingImage),
}));

export type Listing = typeof listing.$inferSelect;
export type NewListing = typeof listing.$inferInsert;
