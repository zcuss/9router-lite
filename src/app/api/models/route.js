import { NextResponse } from "next/server";
import { getModelAliases, setModelAlias } from "@/models";
import { getDisabledModels } from "@/lib/disabledModelsDb";
import { AI_MODELS } from "@/shared/constants/config";
import { getProviderAlias } from "@/shared/constants/providers";
import { getCurrentDashboardUser, canManageUsers } from "@/lib/auth/currentUser";
import { getAdapter } from "@/lib/db/driver";

export const dynamic = "force-dynamic";

async function getPublishedModelIds() {
  try {
    const db = await getAdapter();
    const rows = await db.all(`SELECT model_id, enabled FROM model_publish WHERE enabled = 1`);
    return new Set(rows.map((r) => r.model_id));
  } catch {
    return null; // table missing or DB down → fall through (admin sees all)
  }
}

// GET /api/models - Get models with aliases
// Admin/dev: sees all non-disabled models
// User: only sees models explicitly published in `model_publish`
export async function GET() {
  try {
    const user = await getCurrentDashboardUser();
    const isPrivileged = canManageUsers(user);

    const modelAliases = await getModelAliases();
    const disabled = await getDisabledModels();

    let publishedSet = null;
    if (!isPrivileged) {
      publishedSet = await getPublishedModelIds();
      // If no published set exists yet (table empty), users see nothing
      if (!publishedSet) publishedSet = new Set();
    }

    const models = AI_MODELS
      .filter((m) => {
        const alias = getProviderAlias(m.provider) || m.provider;
        const list = disabled[alias] || disabled[m.provider] || [];
        if (list.includes(m.model)) return false;
        if (!isPrivileged) {
          const fullModel = `${m.provider}/${m.model}`;
          if (!publishedSet.has(fullModel)) return false;
        }
        return true;
      })
      .map((m) => {
        const fullModel = `${m.provider}/${m.model}`;
        return {
          ...m,
          fullModel,
          alias: modelAliases[fullModel] || m.model,
        };
      });

    return NextResponse.json({ models });
  } catch (error) {
    console.log("Error fetching models:", error);
    return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}

// PUT /api/models - Update model alias
export async function PUT(request) {
  try {
    const body = await request.json();
    const { model, alias } = body;

    if (!model || !alias) {
      return NextResponse.json({ error: "Model and alias required" }, { status: 400 });
    }

    const modelAliases = await getModelAliases();

    // Check if alias already exists for different model
    const existingModel = Object.entries(modelAliases).find(
      ([key, val]) => val === alias && key !== model
    );

    if (existingModel) {
      return NextResponse.json({ error: "Alias already in use" }, { status: 400 });
    }

    // Update alias
    await setModelAlias(model, alias);

    return NextResponse.json({ success: true, model, alias });
  } catch (error) {
    console.log("Error updating alias:", error);
    return NextResponse.json({ error: "Failed to update alias" }, { status: 500 });
  }
}
