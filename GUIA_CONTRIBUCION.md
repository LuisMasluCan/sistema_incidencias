# 👨‍💻 Guía de Contribución y Desarrollo

## Configuración Inicial

### Requisitos
- Node.js 18+
- PostgreSQL 13+
- Git

### Setup Local

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd sistema_incidencias

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local

# 4. Editar .env.local
DATABASE_URL=postgresql://user:password@localhost:5432/rgr_incidencias
NODE_ENV=development

# 5. Iniciar servidor
npm run dev

# Acceder a http://localhost:3000
```

## Estructura de Ramas

```
main                    # Producción (protegida)
├── develop             # Integración (default para PRs)
├── feature/empleados   # Nueva funcionalidad
├── fix/bug-xyz         # Corrección de bug
└── docs/api            # Documentación
```

## Flujo de Trabajo

### 1. **Crear rama de feature**

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nueva-funcionalidad

# Convenciones de nombre:
# feature/  - Nueva funcionalidad
# fix/      - Corrección de bug
# docs/     - Documentación
# refactor/ - Mejoras de código
# test/     - Tests
```

### 2. **Desarrollar localmente**

```bash
npm run dev            # Servidor Next.js
npm run lint           # Verificar código
npm run typecheck      # TypeScript
npm run test           # Tests (si existen)
```

### 3. **Hacer commit**

```bash
git add .
git commit -m "feat: agregar validación de DNI" 
# feat: nueva funcionalidad
# fix: corrección
# docs: documentación
# style: formato
# refactor: reorganización
# perf: performance
```

### 4. **Push y Pull Request**

```bash
git push origin feature/nueva-funcionalidad

# Crear PR en GitHub:
# - Título descriptivo
# - Descripción detallada
# - Tests incluidos
# - Changelog actualizado
```

## Estándares de Código

### TypeScript

```typescript
// ✅ BIEN
interface Empleado {
  id: string;
  nombreCompleto: string;
  dni: string;
}

export async function getEmpleado(id: string): Promise<Empleado> {
  const result = await query<Empleado>(
    'SELECT * FROM empleados WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

// ❌ MAL
const getEmpleado = async (id) => {
  return query(`SELECT * FROM empleados WHERE id = '${id}'`);
}
```

### Nombrado

```typescript
// ✅ BIEN
- getEmpleados() - obtiene múltiples
- getEmpleadoById(id) - obtiene uno
- saveEmpleado() - crea o actualiza
- deleteEmpleado(id) - elimina
- isActivo - boolean
- handleClick() - callback

// ❌ MAL
- get_empleados()
- GetEmpleados()
- fetch_emp()
- e (variable corta)
- onClick() en componentes
```

### API Routes

```typescript
// ✅ BIEN
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Empleado } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (id) {
      const result = await query<Empleado>(
        'SELECT * FROM empleados WHERE id = $1',
        [id]
      );
      return NextResponse.json(result.rows[0]);
    }
    
    const result = await query<Empleado>(
      'SELECT * FROM empleados ORDER BY nombre_completo'
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ❌ MAL
export async function GET(req) {
  const data = await query('SELECT * FROM empleados');
  return data;
}
```

### React Components

```typescript
// ✅ BIEN
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { Empleado } from '@/lib/types';

interface EmpleadosPageProps {
  initialData?: Empleado[];
}

export default function EmpleadosPage({ 
  initialData = [] 
}: EmpleadosPageProps) {
  const [empleados, setEmpleados] = useState<Empleado[]>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData.length === 0) {
      loadEmpleados();
    }
  }, []);

  const loadEmpleados = async () => {
    setLoading(true);
    try {
      const data = await fetch('/api/empleados').then(r => r.json());
      setEmpleados(data);
    } catch (error) {
      console.error('Error loading empleados:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (empleados.length === 0) return <div>No empleados found</div>;

  return (
    <div>
      {empleados.map(emp => (
        <div key={emp.id}>{emp.nombreCompleto}</div>
      ))}
    </div>
  );
}

// ❌ MAL
const EmpleadosPage = () => {
  return <div>{/* inline JSX sin estructura */}</div>;
}

// ❌ MAL - No lazy load
const [data, setData] = useState(null);
```

## Adición de Nueva Entidad

### Checklist Completo

```
Agregar "Proyectos"

[ ] 1. Tipo en lib/types.ts
      interface Proyecto { id, nombre, descripcion, estado, fechaInicio }

[ ] 2. Tabla en lib/db.ts
      CREATE TABLE proyectos (...)

[ ] 3. API route app/api/proyectos/route.ts
      GET /api/proyectos
      POST /api/proyectos
      DELETE /api/proyectos

[ ] 4. Funciones en lib/storage.ts
      getProyectosApi()
      saveProyectoApi()
      deleteProyectoApi()

[ ] 5. Página en app/proyectos/page.tsx
      CRUD UI completo

[ ] 6. Actualizar sidebar
      Agregar ruta en components/sidebar.tsx

[ ] 7. Tests
      tests/api/proyectos.test.ts
      tests/components/ProyectosPage.test.tsx

[ ] 8. Documentación
      Actualizar API.md con nuevas rutas
      Documentar schema en ARQUITECTURA_TECNICA.md

[ ] 9. Database migration
      Crear archivo SQL si es necesario
      Actualizar lib/db.ts initializeDatabase()

[ ] 10. Validación
       Agregar esquema Zod en lib/validations/proyecto.ts
```

## Testing

### Unit Tests (Lógica de negocio)

```typescript
// tests/lib/business.test.ts
import { calcularBono } from '@/lib/business';

describe('calcularBono', () => {
  it('debe calcular bono sin descuentos', () => {
    const bono = calcularBono(
      'emp-1',
      '2026-06',
      [], // incidencias
      [], // memorandums
      [], // reglas
      [] // tiposBono
    );
    
    expect(bono.bonoLiquido).toBe(150); // BONO_BASE
  });

  it('debe aplicar descuento por tardanza', () => {
    const incidencia = {
      id: '1',
      empleadoId: 'emp-1',
      categoria: 'Tardanza',
      tipoFalta: 'leve',
      fecha: '2026-06-01',
      // ...
    };
    
    const bono = calcularBono(...);
    expect(bono.deducciones).toHaveLength(1);
  });
});
```

### API Tests

```typescript
// tests/api/empleados.test.ts
import { GET, POST } from '@/app/api/empleados/route';

describe('GET /api/empleados', () => {
  it('debe retornar lista de empleados', async () => {
    const request = new Request('http://localhost/api/empleados');
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('debe filtrar por ID', async () => {
    const request = new Request(
      'http://localhost/api/empleados?id=emp-123'
    );
    const response = await GET(request);
    const data = await response.json();
    
    expect(data.id).toBe('emp-123');
  });
});
```

### Component Tests

```typescript
// tests/components/EmpleadosPage.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import EmpleadosPage from '@/app/empleados/page';

describe('EmpleadosPage', () => {
  it('debe renderizar tabla de empleados', () => {
    render(<EmpleadosPage initialData={[]} />);
    expect(screen.getByText(/Empleados/i)).toBeInTheDocument();
  });

  it('debe mostrar modal al hacer click en "Nuevo"', () => {
    render(<EmpleadosPage initialData={[]} />);
    fireEvent.click(screen.getByText(/Nuevo Empleado/));
    expect(screen.getByText(/Nombre Completo/)).toBeInTheDocument();
  });
});
```

## Deployment

### Variables de Entorno (Production)

```bash
# .env.production
DATABASE_URL=postgresql://prod-user:secure-pass@db.prod.com:5432/rgr
NEXT_PUBLIC_API_URL=https://api.ejemplo.com
NODE_ENV=production
LOG_LEVEL=warn
```

### Build para Producción

```bash
npm run build      # Compilar
npm run start      # Ejecutar servidor
npm run lint       # Verificar antes de deploy
npm run typecheck  # Validar tipos
```

### Docker (Opcional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY .next ./.next
COPY public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

## Checklist de PR

- [ ] Código sigue estándares (TypeScript, nombres, etc.)
- [ ] Tipos están definidos correctamente
- [ ] Sin `any` innecesarios
- [ ] Tests escritos y pasando
- [ ] Sin console.log() en producción
- [ ] Mensajes de error claros
- [ ] Documentación actualizada
- [ ] Commits semánticos
- [ ] Cambios relacionados solamente

## Resolución de Problemas Comunes

### "cannot find module @/lib/db"

```bash
# Verificar tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### "Database connection refused"

```bash
# Verificar PostgreSQL
psql --version
psql -U postgres -d rgr_incidencias

# O resetear en .env.local
DATABASE_URL=postgresql://localhost/rgr_incidencias
```

### "Module not found in Next.js"

```bash
# Limpiar caché
rm -rf .next
npm run dev
```

---

**Última actualización:** Junio 1, 2026
