export const version = 8;
export const name = "add_note_to_topup_payments";

export async function up(db) {
  let hasNote = false;
  try {
    const colRow = await db.get(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'topup_payments' AND column_name = 'note' LIMIT 1`
    );
    hasNote = !!colRow;
  } catch {
    hasNote = false;
  }
  if (!hasNote) {
    try {
      await db.run(`ALTER TABLE topup_payments ADD COLUMN note TEXT`);
    } catch (err) {
      // Ignore SQLite / PG duplicate-column errors
      if (!err.message.includes("already exists") && !err.message.includes("duplicate column")) {
        throw err;
      }
    }
  }
}

export async function down(db) {
  // No destructive down
}

export default { version, name, up, down };
