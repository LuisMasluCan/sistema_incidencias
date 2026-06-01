# 🏗️ Arquitectura Técnica - Sistema RGR

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     NAVEGADOR (Cliente)                     │
├─────────────────────────────────────────────────────────────┤
│                    React/Next.js App                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Pages (app/*)                                     │    │
│  │  - /empleados, /incidencias, /memorandums, etc.   │    │
│  ├────────────────────────────────────────────────────┤    │
│  │  Components (components/*)                         │    │
│  │  - Radix UI, Layouts, Forms                       │    │
│  └────────────────────────────────────────────────────┘    │
│           │                                                  │
│           ▼                                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Storage Layer (lib/storage.ts)                    │    │
│  │  - API abstraction                                 │    │
│  │  - localStorage fallback                           │    │
│  │  - CRUD operations                                 │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────┬──────────────────────────────────────────────┘
              │ HTTP/HTTPS
              ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js Server (Backend)                       │
├─────────────────────────────────────────────────────────────┤
│              API Routes (app/api/*)                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │ GET /api/empleados      │ POST empleados          │    │
│  │ GET /api/incidencias    │ POST incidencias        │    │
│  │ GET /api/memorandums    │ POST memorandums        │    │
│  │ GET /api/bonos          │ POST configuracion      │    │
│  │ GET /api/configuracion  │ DELETE * (all)         │    │
│  │ GET /api/dashboard                                │    │
│  └────────────────────────────────────────────────────┘    │
│           │                                                  │
│           ▼                                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Business Logic (lib/business.ts)                  │    │
│  │  - Cálculo de bonos                                │    │
│  │  - Detección de acumulación de faltas              │    │
│  │  - Dashboard stats                                 │    │
│  └────────────────────────────────────────────────────┘    │
│           │                                                  │
│           ▼                                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Database Layer (lib/db.ts)                        │    │
│  │  - Query builder                                   │    │
│  │  - Connection pool (singleton)                     │    │
│  │  - Schema initialization                           │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────┬──────────────────────────────────────────────┘
              │ TCP/IP (Port 5432 default)
              ▼
┌─────────────────────────────────────────────────────────────┐
│           PostgreSQL Database Server                        │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐    │
│  │  Tables:                                           │    │
│  │  - cargos                                          │    │
│  │  - tipos_bono                                      │    │
│  │  - reglas_descuento                                │    │
│  │  - empleados (FK: cargos)                          │    │
│  │  - incidencias (FK: empleados)                     │    │
│  │  - memorandums (FK: empleados, incidencias)        │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Estructura de Carpetas

```
sistema_incidencias/
├── app/
│   ├── (main routes)
│   │   ├── page.tsx              # Dashboard
│   │   ├── layout.tsx            # Layout principal
│   │   └── globals.css           # Estilos globales
│   ├── api/                      # Rutas API
│   │   ├── empleados/route.ts
│   │   ├── incidencias/route.ts
│   │   ├── memorandums/route.ts
│   │   ├── bonos/route.ts
│   │   ├── configuracion/route.ts
│   │   └── dashboard/route.ts
│   ├── empleados/page.tsx        # CRUD Empleados
│   ├── incidencias/page.tsx      # CRUD Incidencias
│   ├── memorandums/page.tsx      # CRUD Memorandums
│   ├── bonos/page.tsx            # Vista Bonos
│   ├── reportes/page.tsx         # Reportes y Exportación
│   ├── configuracion/page.tsx    # Configuración
│   └── login/page.tsx            # Login
│
├── components/
│   ├── app-layout.tsx            # Layout wrapper
│   ├── sidebar.tsx               # Navegación
│   ├── theme-provider.tsx        # Tema
│   └── ui/                       # Componentes Radix UI (40+)
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── form.tsx
│       ├── table.tsx
│       └── ...
│
├── lib/
│   ├── db.ts                     # Conexión + schema PostgreSQL
│   ├── storage.ts                # Abstracción API + localStorage
│   ├── business.ts               # Lógica de negocio
│   ├── types.ts                  # Interfaces TypeScript
│   ├── empresa.ts                # Constantes de empresa
│   ├── utils.ts                  # Utilidades
│   └── utils/
│       ├── cn.ts                 # Class name helper
│       └── ...
│
├── hooks/
│   ├── use-toast.ts              # Toast notifications
│   └── use-mobile.ts             # Detección mobile
│
├── public/                       # Archivos estáticos
│
├── styles/
│   └── globals.css
│
├── next.config.mjs               # Config Next.js
├── tsconfig.json                 # Config TypeScript
├── package.json                  # Dependencias
└── .env.local                    # Variables de entorno
```

## Flujo de Datos

### 1. **Lectura de Datos (GET)**

```
Usuario abre página
    ↓
Page.tsx carga con useEffect
    ↓
Llama: getEmpleados() / getEmpleadosApi()
    ↓
lib/storage.ts intenta API
    ↓
apiFetch('/api/empleados')
    ↓
Backend recibe GET /api/empleados
    ↓
app/api/empleados/route.ts
    ↓
query('SELECT * FROM empleados')
    ↓
PostgreSQL devuelve datos
    ↓
Backend retorna JSON
    ↓
Frontend setState
    ↓
Re-render con datos
```

### 2. **Escritura de Datos (POST)**

```
Usuario llena formulario y guarda
    ↓
Form.onSubmit()
    ↓
Llama: saveEmpleado(empleado)
    ↓
lib/storage.ts guarda localmente
    ↓
apiFetch('/api/empleados', { method: 'POST', body })
    ↓
Backend recibe POST /api/empleados
    ↓
app/api/empleados/route.ts
    ↓
query('INSERT ... ON CONFLICT UPDATE')
    ↓
PostgreSQL ejecuta
    ↓
Backend retorna { ok: true }
    ↓
Frontend muestra éxito
    ↓
Recarga datos
```

### 3. **Cálculo de Bonos (Async Business Logic)**

```
Usuario abre /bonos con mes seleccionado
    ↓
getBonosDelMes(mes)
    ↓
Obtiene empleados, incidencias, memorandums, reglas
    ↓
calcularBono() se ejecuta para cada empleado
    ↓
Cuenta: tardanzas, faltas leves, faltas graves
    ↓
Aplica reglas de descuento
    ↓
Verifica pérdida total (2+ graves o 5+ leves)
    ↓
Retorna: { bonoBruto, deducciones[], bonoLiquido }
    ↓
Frontend renderiza tabla expandible
```

## Patrones Utilizados

### 1. **Factory Pattern (Pool Connection)**

```typescript
// lib/db.ts
const createPool = () => new Pool({ /* config */ });
const pool = createPool(); // Singleton

// En cada ruta:
export async function GET() {
  const result = await query('SELECT...'); // Reutiliza pool
}
```

### 2. **Adapter Pattern (API + localStorage)**

```typescript
// lib/storage.ts
async function apiFetch<T>(path: string): Promise<T> {
  // Intenta API, fallback a localStorage
  try {
    return await fetch(path).then(r => r.json());
  } catch {
    return getFromStorage<T>(key);
  }
}
```

### 3. **CRUD Pattern (Estándar REST)**

```typescript
// Seguido en cada ruta:
export async function GET(req) { /* get one or many */ }
export async function POST(req) { /* create or update */ }
export async function DELETE(req) { /* delete */ }
```

### 4. **Business Logic Separation**

```typescript
// lib/business.ts
export function calcularBono(...): BonoEmpleado { /* puro */ }

// app/api/bonos/route.ts
const bonos = calcularBono(...); // Llama función pura
return NextResponse.json(bonos);

// app/bonos/page.tsx
const bonos = getBonosDelMes(mes); // Reutiliza misma lógica
```

## Principios de Escalabilidad

### 1. **Separación de Responsabilidades**
- ✅ `app/` → Presentación (Next.js pages)
- ✅ `components/` → UI reutilizable
- ✅ `lib/business.ts` → Lógica pura
- ✅ `lib/storage.ts` → Acceso a datos
- ✅ `lib/db.ts` → Persistencia

### 2. **No Duplicar Lógica de Negocio**
- ✅ `calcularBono()` en business.ts reutilizado:
  - En `/bonos` página
  - En `/api/bonos` ruta
  - En dashboard stats

### 3. **Types First (Type Safety)**
- ✅ Interfaces en `lib/types.ts`
- ✅ Validación implícita en TypeScript
- ✅ Menos bugs en runtime

### 4. **Connection Pooling**
- ✅ Singleton pattern en `lib/db.ts`
- ✅ Reutiliza conexiones PostgreSQL
- ✅ Previene exhaustión de conexiones

## Cómo Agregar Nueva Funcionalidad

### Ejemplo: Agregar entidad "Departamentos"

```typescript
// 1. Agregar tipo en lib/types.ts
export interface Departamento {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

// 2. Crear tabla en lib/db.ts
CREATE TABLE departamentos (
  id UUID PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true
);

// 3. Crear API route en app/api/departamentos/route.ts
export async function GET(request: Request) {
  const result = await query('SELECT * FROM departamentos');
  return NextResponse.json(result.rows);
}

export async function POST(request: Request) {
  const dept = await request.json();
  await query('INSERT INTO departamentos (...) VALUES (...)', [...]);
  return NextResponse.json({ ok: true });
}

// 4. Agregar funciones en lib/storage.ts
export async function getDepartamentosApi(): Promise<Departamento[]> {
  return apiFetch<Departamento[]>('/api/departamentos');
}

export async function saveDepartamentoApi(dept: Departamento): Promise<void> {
  await apiFetch('/api/departamentos', {
    method: 'POST',
    body: JSON.stringify(dept)
  });
}

// 5. Crear página en app/departamentos/page.tsx
export default function DepartamentosPage() {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  
  useEffect(() => {
    getDepartamentosApi().then(setDepartamentos);
  }, []);
  
  // Renderizar tabla + modal CRUD
}
```

## Performance Considerations

### ¿Qué hace lento el sistema?

1. **Sin índices en BD**
   - Solución: CREATE INDEX en campos frecuentes

2. **Re-renders innecesarios**
   - Solución: React Query + useMemo

3. **Carga de todos los datos**
   - Solución: Paginación cursor-based

4. **Sin caché**
   - Solución: Redis + staleTime en React Query

5. **localStorage en cada búsqueda**
   - Solución: localStorage solo para autenticación

### Métricas Objetivo

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Time to Interactive (TTI) | ~2s | <1s |
| First Contentful Paint (FCP) | ~1.5s | <0.8s |
| API Response Time | 50-200ms | <50ms |
| Database Query | 10-50ms | <10ms |
| Bundle Size | ~200KB | <150KB |

## Seguridad Implementada

✅ **Ya presente:**
- SQL Injection prevention (prepared statements)
- XSS prevention (React escaping automático)
- HTTPS support (ready)
- CORS headers (configurables)

❌ **Falta:**
- CSRF protection (agregar token)
- Rate limiting
- Input validation
- SQL query logging

---

**Última actualización:** Junio 1, 2026
