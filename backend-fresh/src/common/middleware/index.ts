// Auth middleware intentionally left empty — auth is disabled for now.
// When re-enabled, add requireAuth here and import into app.ts.
export const requireAuth = async (_c: any, _next: any) => {
  // No-op: all endpoints are public for now
}
