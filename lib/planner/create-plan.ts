import type { PlanRequest, ProjectPlan } from "./schema";

const contains = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

export function createProjectPlan(input: PlanRequest): ProjectPlan {
  const brief = input.description.toLowerCase();
  const ecommerce = contains(brief, ["e-commerce", "ecommerce", "online store", "shopping cart", "products", "checkout", "تجارة إلكترونية", "متجر"]);
  const booking = contains(brief, ["booking", "reservation", "appointment", "calendar", "حجز", "موعد"]);
  const company = contains(brief, ["employee", "company", "team", "task", "sales", "dashboard", "موظف", "شركة", "مهام"]);
  const auth = contains(brief, ["account", "login", "sign in", "user", "profile", "حساب", "تسجيل الدخول"]);
  const payments = contains(brief, ["payment", "checkout", "billing", "pay", "دفع"]);
  const admin = contains(brief, ["admin", "dashboard", "manage", "management", "مدير", "إدارة"]);
  const features = [
    "Responsive application shell and reusable UI components",
    ...(auth ? ["User registration, sign-in, and role-aware account area"] : ["Authentication requirements to be confirmed during specification"]),
    ...(ecommerce ? ["Product catalogue, product details, and shopping cart"] : []),
    ...(booking ? ["Availability calendar and reservation workflow"] : []),
    ...(company ? ["Operational dashboard, task tracking, and reporting"] : []),
    ...(payments ? ["Server-side payment integration with verified provider webhooks"] : []),
    ...(admin ? ["Protected administration area with server-enforced permissions"] : []),
    "Validated forms with clear loading, success, and error states",
    "Versioned project changes with a reviewable history",
  ];
  const pages = [
    "Home / landing page",
    ...(auth ? ["Sign in", "Create account", "Account settings"] : ["Authentication (confirm whether required)"]),
    ...(ecommerce ? ["Product catalogue", "Product details", "Cart", "Checkout"] : []),
    ...(booking ? ["Services", "Availability calendar", "Reservation details"] : []),
    ...(company ? ["Operations dashboard", "Tasks", "Reports"] : []),
    ...(admin ? ["Admin dashboard", "User and settings management"] : []),
    "Not found / error states",
  ];
  const dataModels = [
    ...(auth ? ["User", "Session / role"] : ["User (if accounts are required)"]),
    ...(ecommerce ? ["Product", "CartItem", "Order"] : []),
    ...(booking ? ["Service", "AvailabilitySlot", "Reservation"] : []),
    ...(company ? ["Employee", "Task", "ActivityLog"] : []),
    ...(payments ? ["PaymentAttempt (provider references only; never store card data)"] : []),
    "AuditEvent",
  ];
  const securityChecks = [
    "No secrets in browser code, source control, or generated client bundles",
    "Authentication and authorization enforced on the server",
    "Object-level access tests prevent cross-user data access",
    "Input validation and safe error responses on every API boundary",
    "Dependency vulnerability and static analysis scans",
    "Database access policies and least-privilege credentials",
    "Security headers, rate limits, and abuse controls reviewed before launch",
  ];
  return {
    projectName: input.projectName || "Untitled project",
    summary: "A first-pass blueprint derived from your description. Confirm the requirements before code generation begins.",
    features,
    pages,
    dataModels,
    securityChecks,
    fileTree: [
      "src/app/ — routes, layouts, and providers",
      "src/features/ — business features grouped by domain",
      "src/components/ui/ — shared accessible components",
      "src/server/ — server-only business logic",
      "src/server/auth/ — identity and authorization",
      "src/server/validators/ — request schemas",
      "src/lib/ — shared utilities and typed configuration",
      "database/schema/ — data model definitions",
      "database/migrations/ — versioned schema changes",
      "tests/unit/ — isolated logic tests",
      "tests/integration/ — API and database tests",
      "tests/e2e/ — critical user journeys",
      "docs/architecture/ — decisions and system boundaries",
      ".env.example — variable names only; no real secrets",
    ],
    recommendedStack: [
      "Next.js + React + TypeScript",
      "PostgreSQL for relational data",
      "Zod for runtime input validation",
      "Vitest + Playwright for automated testing",
      "Semgrep + Gitleaks + OSV-Scanner for security checks",
      "Provider-neutral AI gateway (configure before generation)",
    ],
    agents: [
      { name: "Planner", task: "Convert the brief into explicit requirements and acceptance criteria." },
      { name: "Architect", task: "Choose modules, boundaries, data models, and a maintainable file tree." },
      { name: "Security", task: "Define mandatory controls and automated security checks." },
      { name: "Builder", task: "Implement small, reviewable code changes within the approved architecture." },
      { name: "Verifier", task: "Run tests and scans; block release when required gates fail." },
    ],
  };
}
