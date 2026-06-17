// Migration registry — append new entries when schema changes.
// Each migration: { version: number, name: string, up(db): void }
// Versions MUST be unique and monotonically increasing.
import m001 from "./001-initial.js";
import m002 from "./002-prd-v2-schema.js";
import m003 from "./003-seed-admin.js";
import m004 from "./004-wallet-voucher.js";
import m005 from "./005-multi-provider-auth.js";
import m006 from "./006-per-user-keys-and-model-publish.js";
import m007 from "./007-user-subscription-plan.js";
import m008 from "./008-add-note-to-payments.js";
import m009 from "./009-user-providers-sync.js";
import m010 from "./010-model-tunings.js";
import m011 from "./011-voucher-per-user-limit.js";

export const MIGRATIONS = [m001, m002, m003, m004, m005, m006, m007, m008, m009, m010, m011].sort(
  (a, b) => a.version - b.version
);

export function latestVersion() {
  return MIGRATIONS.length ? MIGRATIONS[MIGRATIONS.length - 1].version : 0;
}
