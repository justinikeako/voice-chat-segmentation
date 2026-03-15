/**
 * Drizzle schema (MySQL) – mirrors app/models (User, Scan, Seller, Product).
 * Use with DATABASE_URL (e.g. mysql2) or XAMPP MySQL.
 *
 * Install: npm i drizzle-orm mysql2 (and optionally drizzle-kit for migrations)
 */

import {
  mysqlTable,
  int,
  varchar,
  text,
  boolean,
  double,
  datetime,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// ─── users ─────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: datetime("created_at"),
  // Stored hair profile (populated after first scan)
  hairType: varchar("hair_type", { length: 10 }), // e.g. "4B"
  porosity: varchar("porosity", { length: 20 }), // Low / Medium / High
  scalpCondition: varchar("scalp_condition", { length: 50 }), // Dry / Oily / Healthy etc.
  texture: varchar("texture", { length: 20 }), // fine / medium / coarse
});

// ─── scans ─────────────────────────────────────────────────────────────────
export const scans = mysqlTable("scans", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: datetime("created_at"),
  // Classification results
  hairType: varchar("hair_type", { length: 10 }), // 3A / 3B / 3C / 4A / 4B / 4C
  porosity: varchar("porosity", { length: 20 }),
  texture: varchar("texture", { length: 20 }),
  curlPattern: varchar("curl_pattern", { length: 100 }),
  scalpScore: int("scalp_score"), // 1–10
  scalpCondition: varchar("scalp_condition", { length: 50 }),
  scalpObservations: text("scalp_observations"),
  // Raw AI response stored for debugging
  rawGptResponse: text("raw_gpt_response"),
  mlModelPrediction: varchar("ml_model_prediction", { length: 10 }), // What the CNN predicted
  mlConfidence: double("ml_confidence"),
  // Image reference (store path or Azure Blob URL)
  imageUrl: varchar("image_url", { length: 500 }),
});

// ─── sellers ───────────────────────────────────────────────────────────────
export const sellers = mysqlTable("sellers", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }), // Kingston / MoBay / Spanish Town / Online
  instagramUrl: varchar("instagram_url", { length: 500 }),
  websiteUrl: varchar("website_url", { length: 500 }),
  phone: varchar("phone", { length: 50 }),
  verified: boolean("verified").default(false),
  createdAt: datetime("created_at"),
});

// ─── products ──────────────────────────────────────────────────────────────
export const products = mysqlTable("products", {
  id: int("id").primaryKey().autoincrement(),
  sellerId: int("seller_id").references(() => sellers.id),
  name: varchar("name", { length: 255 }).notNull(),
  brand: varchar("brand", { length: 255 }),
  category: varchar("category", { length: 100 }), // Shampoo / Conditioner / Oil / Styler
  suitableHairTypes: varchar("suitable_hair_types", { length: 100 }), // "4A,4B,4C"
  suitablePorosity: varchar("suitable_porosity", { length: 50 }), // "Low,Medium"
  avoidHairTypes: varchar("avoid_hair_types", { length: 100 }),
  priceJmd: double("price_jmd"),
  inStock: boolean("in_stock").default(true),
  amazonUrl: varchar("amazon_url", { length: 500 }),
  localAvailable: boolean("local_available").default(false),
  createdAt: datetime("created_at"),
  updatedAt: datetime("updated_at"),
});

// ─── relations ─────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  scans: many(scans),
}));

export const scansRelations = relations(scans, ({ one }) => ({
  user: one(users, { fields: [scans.userId], references: [users.id] }),
}));

export const sellersRelations = relations(sellers, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  seller: one(sellers, { fields: [products.sellerId], references: [sellers.id] }),
}));
