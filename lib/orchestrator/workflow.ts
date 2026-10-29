import { BLINK_AGENT_ROLES } from "@/lib/agents/roles";

export type WorkflowStage = "planning" | "architecture" | "security" | "building" | "verification" | "preview" | "blocked";

export type WorkflowEvent = {
  stage: WorkflowStage;
  message: string;
  requiresHumanReview?: boolean;
};

export function createInitialWorkflowEvents(): WorkflowEvent[] {
  return [
    { stage: "planning", message: BLINK_AGENT_ROLES[0].responsibility },
    { stage: "architecture", message: BLINK_AGENT_ROLES[1].responsibility },
    { stage: "security", message: BLINK_AGENT_ROLES[2].responsibility },
    { stage: "building", message: BLINK_AGENT_ROLES[3].responsibility },
    { stage: "verification", message: BLINK_AGENT_ROLES[4].responsibility },
    { stage: "preview", message: "Preview can be offered only after the configured build and verification gates pass." },
  ];
}

/**
 * Release decision helper. In production this must consume signed/traceable tool results,
 * not free-form claims from a language model.
 */
export function canRelease(input: {
  buildPassed: boolean;
  requiredTestsPassed: boolean;
  leakedSecrets: number;
  criticalVulnerabilities: number;
  authorizationTestsPassed: boolean;
}) {
  const reasons: string[] = [];
  if (!input.buildPassed) reasons.push("Build has not passed.");
  if (!input.requiredTestsPassed) reasons.push("Required tests have not passed.");
  if (input.leakedSecrets > 0) reasons.push("Potential leaked secrets were detected.");
  if (input.criticalVulnerabilities > 0) reasons.push("Critical dependency or code vulnerabilities remain.");
  if (!input.authorizationTestsPassed) reasons.push("Authorization tests have not passed.");
  return { allowed: reasons.length === 0, reasons };
}
