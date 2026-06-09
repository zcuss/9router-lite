export async function getCombos() {
  try {
    const mod = await import("@/lib/db/repos/combosRepo.js");
    return await mod.getCombos();
  } catch {
    return [];
  }
}
