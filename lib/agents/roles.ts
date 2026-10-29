export const BLINK_AGENT_ROLES = [
  {
    id: "planner",
    name: "Agent Planner",
    responsibility: "Requirements, scope, user stories, and acceptance criteria.",
    output: "A validated product specification.",
  },
  {
    id: "architect",
    name: "Agent Architect",
    responsibility: "Module boundaries, file tree, data model, and technical decisions.",
    output: "An architecture manifest that other agents must follow.",
  },
  {
    id: "security",
    name: "Security Agent",
    responsibility: "Threat modelling, secrets policy, access control, and required checks.",
    output: "A machine-readable security policy and release gates.",
  },
  {
    id: "builder",
    name: "Coding Agent",
    responsibility: "Implement the smallest coherent change within the approved architecture.",
    output: "A patch, change summary, and tests.",
  },
  {
    id: "verifier",
    name: "Testing & Repair Agent",
    responsibility: "Run build, unit, integration, end-to-end, and security checks.",
    output: "A verification report with pass/fail results.",
  },
] as const;

export type BlinkAgentId = (typeof BLINK_AGENT_ROLES)[number]["id"];
