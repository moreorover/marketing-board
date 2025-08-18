import {relations} from "drizzle-orm";
import {index, integer, pgTable, text, uuid} from "drizzle-orm/pg-core";
import {listing} from "@/db/schema/listing";

export const listingPricing = pgTable(
	"listing_pricing",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		listingId: uuid("listing_id")
			.notNull()
			.references(() => listing.id, { onDelete: "cascade" }),
		duration: text("duration").notNull(), // e.g., "15 min", "30 min", "1 hour"
		price: integer("price").notNull(), // price in smallest currency unit (pence/cents)
	},
	(table) => ({
		listingIdIdx: index("listing_pricing_listing_id_idx").on(table.listingId),
		priceIdx: index("listing_pricing_price_idx").on(table.price),
		durationIdx: index("listing_pricing_duration_idx").on(table.duration),
	}),
);

export const listingPricingRelations = relations(listingPricing, ({ one }) => ({
	listing: one(listing, {
		fields: [listingPricing.listingId],
		references: [listing.id],
	}),
}));

export type ListingPricing = typeof listingPricing.$inferSelect;
export type NewListingPricing = typeof listingPricing.$inferInsert;