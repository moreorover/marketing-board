import { relations } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { listing } from "./listing";

export const listingImage = pgTable("listing_image", {
	id: uuid("id").defaultRandom().primaryKey(),
	listingId: uuid("listing_id")
		.notNull()
		.references(() => listing.id, { onDelete: "cascade" }),
	objectKey: text("object_key").notNull(), // S3 object key
	isMain: boolean("is_main").notNull().default(false),
	uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const listingImageRelations = relations(listingImage, ({ one }) => ({
	listing: one(listing, {
		fields: [listingImage.listingId],
		references: [listing.id],
	}),
}));

export type ListingImage = typeof listingImage.$inferSelect;
export type NewListingImage = typeof listingImage.$inferInsert;