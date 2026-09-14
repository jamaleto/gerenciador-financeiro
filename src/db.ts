import pg from "pg";
import "dotenv/config";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL não configurada");

export const db = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
});

export async function withTransaction<T>(work:(client:pg.PoolClient)=>Promise<T>):Promise<T>{
  const client=await db.connect();
  try{await client.query("BEGIN");const result=await work(client);await client.query("COMMIT");return result;}
  catch(error){await client.query("ROLLBACK");throw error;}
  finally{client.release();}
}

export function cents(value:number):number{
  if(!Number.isSafeInteger(value)||value<0) throw new Error("Valor em centavos inválido");
  return value;
}
