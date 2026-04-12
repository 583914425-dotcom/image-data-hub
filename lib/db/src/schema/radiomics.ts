import { pgTable, text, serial, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { patientsTable } from "./patients";
import { imagingRecordsTable } from "./imaging";

export const radiomicsFeaturesTable = pgTable("radiomics_features", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patientsTable.id, { onDelete: "cascade" }),
  featureClass: text("feature_class").notNull(),
  featureName: text("feature_name").notNull(),
  featureValue: real("feature_value").notNull(),
  imagingId: integer("imaging_id").references(() => imagingRecordsTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRadiomicsFeatureSchema = createInsertSchema(radiomicsFeaturesTable).omit({ id: true, createdAt: true });
export type InsertRadiomicsFeature = z.infer<typeof insertRadiomicsFeatureSchema>;
export type RadiomicsFeature = typeof radiomicsFeaturesTable.$inferSelect;
