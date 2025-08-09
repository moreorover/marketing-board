import { pgTable, text, uuid, json } from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";

export const listing = pgTable("listing", {
	id: uuid("id").primaryKey().defaultRandom(),
	title: text("title").notNull(),
	description: text("description").notNull(),
	location: text("location").notNull(),
	imageUrls: json("image_urls").$type<string[]>().default([]),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});
