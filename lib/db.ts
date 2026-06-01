import { Pool } from 'pg';

declare global {
  var __pgPool: Pool | undefined;
  var __pgPoolInitPromise: Promise<Pool> | undefined;
}

const getDatabaseUrl = (): string => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to connect to the database.');
  }
  return connectionString;
};

const initializeDatabase = async (pool: Pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cargos (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      descripcion TEXT DEFAULT '',
      activo BOOLEAN NOT NULL DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS tipos_bono (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      monto_base NUMERIC NOT NULL,
      activo BOOLEAN NOT NULL DEFAULT TRUE,
      periodicidad TEXT NOT NULL,
      reglas JSONB DEFAULT '[]'::jsonb
    );

    CREATE TABLE IF NOT EXISTS reglas_descuento (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      tipo TEXT NOT NULL,
      porcentaje_descuento NUMERIC NOT NULL,
      activa BOOLEAN NOT NULL DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS empleados (
      id TEXT PRIMARY KEY,
      nombre_completo TEXT NOT NULL,
      dni TEXT NOT NULL,
      cargo TEXT NOT NULL,
      cargo_id TEXT,
      fecha_ingreso DATE NOT NULL,
      estado TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS incidencias (
      id TEXT PRIMARY KEY,
      empleado_id TEXT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
      fecha DATE NOT NULL,
      tipo_falta TEXT NOT NULL,
      categoria TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      medida_aplicada TEXT NOT NULL,
      evidencia TEXT NOT NULL,
      negativa_firmar BOOLEAN NOT NULL DEFAULT FALSE,
      testigos TEXT NOT NULL,
      memorandum_id TEXT
    );

    CREATE TABLE IF NOT EXISTS memorandums (
      id TEXT PRIMARY KEY,
      empleado_id TEXT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
      incidencia_id TEXT REFERENCES incidencias(id) ON DELETE SET NULL,
      fecha DATE NOT NULL,
      asunto TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      base_normativa JSONB NOT NULL DEFAULT '[]'::jsonb,
      monto_bono_afectado NUMERIC NOT NULL,
      negativa_firmar BOOLEAN NOT NULL DEFAULT FALSE,
      testigos TEXT NOT NULL
    );
  `);
};

const createPool = async () => {
  const pool = new Pool({
    connectionString: getDatabaseUrl(),
    ssl: { rejectUnauthorized: false }
  });

  await initializeDatabase(pool);
  return pool;
};

export const getPool = async (): Promise<Pool> => {
  const globalWithPg = globalThis as typeof globalThis & {
    __pgPool?: Pool;
    __pgPoolInitPromise?: Promise<Pool>;
  };

  if (globalWithPg.__pgPool) {
    return globalWithPg.__pgPool;
  }

  if (!globalWithPg.__pgPoolInitPromise) {
    globalWithPg.__pgPoolInitPromise = (async () => {
      const pool = await createPool();
      globalWithPg.__pgPool = pool;
      return pool;
    })();
  }

  return globalWithPg.__pgPoolInitPromise;
};

export const query = async <T = any>(text: string, params: unknown[] = []) => {
  const pool = await getPool();
  return pool.query<T>(text, params);
};
