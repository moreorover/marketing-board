import {relations} from "drizzle-orm";
import {index, pgTable, text, uuid, varchar} from "drizzle-orm/pg-core";
import {user} from "@/db/schema/auth";
import {listingPhoto} from "@/db/schema/listing-photo";

export const listing = pgTable(
	"listing",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		title: text("title").notNull(),
		description: text("description").notNull(),
		location: text("location").notNull(),
		city: text("city").notNull(),
		phone: text("phone").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		// UK postcodes: outcode max 4 chars, incode max 3 chars
		postcodeOutcode: varchar("postcode_outcode", { length: 4 }).notNull(),
		postcodeIncode: varchar("postcode_incode", { length: 3 }).notNull(),
	},
	(table) => ({
		postcodeOutcodeIdx: index("listing_outcode_idx").on(table.postcodeOutcode),
		// Optional: composite index for exact postcode searches
		postcodeCompositeIdx: index("listing_postcode_composite_idx").on(
			table.postcodeOutcode,
			table.postcodeIncode,
		),
	}),
);

export const listingRelations = relations(listing, ({ many, one }) => ({
	images: many(listingPhoto),
	user: one(user, {
		fields: [listing.userId],
		references: [user.id],
	}),
}));

export type Listing = typeof listing.$inferSelect;
export type NewListing = typeof listing.$inferInsert;
