import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { patientsTable } from "./patients";

export const imagingRecordsTable = pgTable("imaging_records", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patientsTable.id, { onDelete: "cascade" }),
  modality: text("modality").notNull(),
  bodyPart: text("body_part").notNull(),
  studyDate: timestamp("study_date", { withTimezone: true }).notNull(),
  description: text("description"),
  findings: text("findings"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertImagingRecordSchema = createInsertSchema(imagingRecordsTable).omit({ id: true, createdAt: true });
export type InsertImagingRecord = z.infer<typeof insertImagingRecordSchema>;
export type ImagingRecord = typeof imagingRecordsTable.$inferSelect;
