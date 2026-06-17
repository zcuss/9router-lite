export const version = 7;
export const name = "user_subscription_plan";

export async function up(db) {
  let hasPlan = false;
  try {
    const colRow = await db.get(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'plan' LIMIT 1`
    );
    hasPlan = !!colRow;
  } catch {
    hasPlan = false;
  }
  if (!hasPlan) {
    try {
      await db.run(`ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'lite'`);
    } catch (err) {
      // ignore SQLite / PG duplicate errors
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
