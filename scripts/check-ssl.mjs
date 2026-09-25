// Tries the connection string in BASE with three SSL settings and prints what happens.
// Usage: BASE="postgresql://..." node scripts/check-ssl.mjs
import pg from "pg";
const base = process.env.BASE;
for (const suffix of ["", "?sslmode=require", "?sslmode=require&uselibpqcompat=true"]) {
  const pool = new pg.Pool({ connectionString: base + suffix, connectionTimeoutMillis: 8000 });
  try {
    const r = await pool.query("select 1 as ok");
    console.log(JSON.stringify(suffix || "(none)"), "->", "ok", r.rows[0].ok);
  } catch (e) {
    console.log(JSON.stringify(suffix || "(none)"), "->", e.message);
  }
  await pool.end().catch(() => {});
}
