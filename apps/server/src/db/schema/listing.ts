import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";

export const listing = pgTable("listing", {
	id: uuid("id").primaryKey().defaultRandom(),
	title: text("title").notNull(),
	description: text("description").notNull(),
	location: text("location").notNull(),
	phone: text("phone").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});
