export type Preset = {
  id?: string;
  name: string;
  endpoint?: string;
  model?: string;
  system?: string | null;
  params?: any;
  payload?: any;
  createdAt?: string;
  updatedAt?: string;
};

const store = new Map<string, Preset>();

export async function listPlaygroundPresets() {
  return Array.from(store.values());
}

export async function getPlaygroundPreset(id: string) {
  return store.get(id) || null;
}

export async function createPlaygroundPreset(input: Preset) {
  const preset = {
    ...input,
    id: input.id || crypto.randomUUID(),
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.set(preset.id, preset);
  return preset;
}

export async function updatePlaygroundPreset(id: string, patch: Partial<Preset>) {
  const current = store.get(id);
  if (!current) return null;
  const next = { ...current, ...patch, id, updatedAt: new Date().toISOString() };
  store.set(id, next);
  return next;
}

export async function deletePlaygroundPreset(id: string) {
  return store.delete(id);
}
