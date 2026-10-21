export type DemoMode = "synthetic" | "ccd_local";

/** Fixed SQL identifiers only; never interpolate an HTTP/environment string. */
export function profileRelation(mode: DemoMode): string {
  if (mode === "ccd_local") return "banuchat.ccd_demo_contexts";
  if (mode === "synthetic") return "banuchat.synthetic_profiles";
  throw new TypeError("Invalid demo mode");
}
