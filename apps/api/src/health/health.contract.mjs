/** This dependency-free contract powers the API endpoint and local contract tests. */
export function healthPayload() {
  return { status: "ok", service: "worksphere-api", version: "0.1.0" };
}

export function infoPayload() {
  return { name: "WorkSphere AI API", stage: 1, environment: "foundation", features: ["health", "metadata"] };
}
