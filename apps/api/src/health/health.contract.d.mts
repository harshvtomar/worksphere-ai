export function healthPayload(): { status: "ok"; service: "worksphere-api"; version: string };
export function infoPayload(): { name: string; stage: number; environment: string; features: string[] };
