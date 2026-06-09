export async function getProviderConnections(params = {}) {
  try {
    const mod = await import("@/lib/db/repos/connectionsRepo.js");
    return await mod.getProviderConnections(params);
  } catch {
    return [];
  }
}
