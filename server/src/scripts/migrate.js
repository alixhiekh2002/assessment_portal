import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();
import { pool } from "../db.js";

const schemaPath = path.resolve("src/scripts/schema.sql");
const sql = fs.readFileSync(schemaPath, "utf-8");

async function main() {
  try {
    await pool.query(sql);
    console.log("✅ Migration completed");
  } catch (e) {
    console.error("❌ Migration failed", e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
main();
