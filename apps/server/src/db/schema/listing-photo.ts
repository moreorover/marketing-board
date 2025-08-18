import {relations} from "drizzle-orm";
import {boolean, pgTable, text, timestamp, uuid} from "drizzle-orm/pg-core";
import {user} from "@/db/schema/auth";
import {listing} from "@/db/schema/listing";

export const listingPhoto = pgTable("listing_photo", {
	id: uuid("id").defaultRandom().primaryKey(),
	listingId: uuid("listing_id").references(() => listing.id, {
		onDelete: "set null",
	}),
	userId: text("user_id").references(() => user.id, {
		onDelete: "set null",
	}),
	isMain: boolean("is_main").notNull().default(false),
	objectKey: text("object_key").notNull(),
	uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const listingPhotoRelations = relations(listingPhoto, ({ one }) => ({
	listing: one(listing, {
		fields: [listingPhoto.listingId],
		references: [listing.id],
	}),
	user: one(user, {
		fields: [listingPhoto.listingId],
		references: [user.id],
	}),
}));

export type ListingPhoto = typeof listingPhoto.$inferSelect;
export type NewListingPhoto = typeof listingPhoto.$inferInsert;
