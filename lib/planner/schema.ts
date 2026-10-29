import { z } from "zod";

export const planRequestSchema = z.object({
  description: z.string().trim().min(12, "Describe the application in at least 12 characters.").max(4000, "Description must be 4,000 characters or fewer."),
  projectName: z.string().trim().min(1).max(60).default("Untitled project"),
});

export type PlanRequest = z.infer<typeof planRequestSchema>;

export type ProjectPlan = {
  projectName: string;
  summary: string;
  features: string[];
  pages: string[];
  dataModels: string[];
  securityChecks: string[];
  fileTree: string[];
  recommendedStack: string[];
  agents: { name: string; task: string }[];
};
