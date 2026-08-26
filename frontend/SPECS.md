# Frontend Specs — Clothing POS

## Visión General

Sistema POS multi-tenant para tiendas de ropa. El frontend consume la API REST del backend (FastAPI en `http://localhost:8000`). Usuarios se autentican con JWT y operan dentro de su tenant.

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Fetch nativo (o axios) para llamadas a API
- Zustand o Context API para estado global (auth/user)

---

## Páginas y Rutas

### Públicas (sin autenticación)

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/login` | Login | Email + password |
| `/register` | Registro | Crear tenant + usuario owner |

### Protegidas (requieren JWT)

| Ruta | Página | Roles |
|------|--------|-------|
| `/dashboard` | Dashboard | todos |
| `/pos` | Punto de venta | todos |
| `/products` | Lista de productos | owner, admin |
| `/products/new` | Crear producto | owner, admin |
| `/products/[id]` | Editar producto | owner, admin |
| `/inventory` | Gestión de inventario | owner, admin |
| `/sales` | Historial de ventas | todos (filtrado por rol) |
| `/sales/[id]` | Detalle de venta | todos |
| `/stores` | Gestión de tiendas | owner |
| `/catalog` | Marcas, categorías, tallas | owner, admin |
| `/users` | Gestión de usuarios | owner |

---

## Módulos Funcionales

### 1. Autenticación (`/login`, `/register`)

**Login:**
- Campos: email, password
- Llama `POST /api/auth/login`
- Guarda token en localStorage/cookie
- Redirige a `/dashboard`

**Registro:**
- Campos: nombre completo, email, password, nombre de negocio, slug
- Llama `POST /api/auth/register`
- Crea tenant + usuario owner
- Autologin después del registro

**Sesión:**
- Middleware que verifica token en rutas protegidas
- `GET /api/auth/me` para obtener usuario actual al cargar la app
- Logout: limpiar token y redirigir a `/login`

---

### 2. Dashboard (`/dashboard`)

Vista resumen con:
- Ventas del día (cantidad y total $)
- Productos con stock bajo (< 5 unidades)
- Últimas 5 ventas
- Accesos rápidos: ir a POS, ver inventario

---

### 3. Punto de Venta — POS (`/pos`)

**Flujo principal:**
1. Buscar producto por código de barras o nombre
2. Seleccionar variante (talla)
3. Agregar al carrito con cantidad
4. Ver resumen: items, subtotales, total
5. Confirmar venta → `POST /api/sales`

**UI:**
- Panel izquierdo: búsqueda + resultados de productos
- Panel derecho: carrito actual
- Input de barcode con autofocus (simula pistola lectora)
- Validación de stock en tiempo real
- Selector de tienda (si owner opera en múltiples)

---

### 4. Productos (`/products`)

**Lista:**
- Tabla con: nombre, barcode, categoría, marca, precio, costo
- Filtros: categoría, marca
- Búsqueda por nombre/barcode
- Botón "Nuevo producto"

**Crear/Editar:**
- Form: nombre, barcode, costo, precio, categoría (select), marca (select)
- Sección de variantes: agregar tallas al producto
- Al crear variante se puede asignar stock inicial por tienda

---

### 5. Inventario (`/inventory`)

**Vista:**
- Tabla: producto, variante (talla), tienda, stock actual
- Filtros: tienda, producto
- Búsqueda

**Acciones:**
- Ajuste de stock: cambiar cantidad manualmente (con nota)
- Restock: agregar stock (entrada de mercancía)
- Transferencia: mover stock entre tiendas (`transfer_out` + `transfer_in`)

**Movimientos:**
- Historial de movimientos con tipo, cantidad, fecha, usuario, notas
- Filtrable por tienda, producto, tipo

---

### 6. Ventas (`/sales`)

**Lista:**
- Tabla: #id, fecha, tienda, cajero, total, estado
- Filtros: tienda, fecha, estado
- Click → detalle

**Detalle (`/sales/[id]`):**
- Info de la venta: fecha, tienda, cajero, total, estado
- Tabla de items: producto, talla, cantidad, precio unitario, subtotal, qty devuelta
- Acciones (owner/admin):
  - Cancelar venta completa
  - Devolución parcial (seleccionar item + cantidad)

---

### 7. Tiendas (`/stores`)

- Lista de tiendas/bodegas del tenant
- Crear: nombre, tipo (store/warehouse), dirección
- Editar: actualizar datos, activar/desactivar
- Solo visible para owner

---

### 8. Catálogo (`/catalog`)

Gestión de entidades auxiliares en tabs o secciones:

**Marcas:**
- Lista + crear nueva (`POST /api/catalog/brands`)

**Categorías:**
- Lista + crear nueva (`POST /api/catalog/categories`)

**Tallas:**
- Lista + crear nueva (`POST /api/catalog/sizes`)

---

### 9. Usuarios (`/users`)

- Solo owner
- Lista: nombre, email, rol, tienda asignada, activo
- Crear usuario: `POST /api/auth/register` (futuro) o endpoint dedicado
- Editar: cambiar rol, asignar a tienda, activar/desactivar

---

## Componentes Compartidos

| Componente | Uso |
|-----------|-----|
| `Layout` | Sidebar + header + contenido |
| `Sidebar` | Navegación principal (condicional por rol) |
| `ProtectedRoute` | Middleware/wrapper auth |
| `DataTable` | Tabla reutilizable con filtros, búsqueda, paginación |
| `Modal` | Confirmaciones, formularios rápidos |
| `Toast` | Notificaciones de éxito/error |
| `Select` | Dropdowns para categorías, marcas, tiendas |
| `Badge` | Estados (activo/inactivo, completada/cancelada) |
| `StatCard` | Cards del dashboard |

---

## API Client

Archivo centralizado `src/lib/api.ts`:
- Base URL configurable via `NEXT_PUBLIC_API_URL`
- Interceptor que agrega header `Authorization: Bearer <token>`
- Manejo de 401 → redirect a login
- Tipado de requests/responses

---

## Variables de Entorno

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Diseño UI

- Tema claro (posible dark mode futuro)
- Sidebar colapsable en móvil
- Responsive: POS optimizado para tablet/desktop
- Colores: neutros + accent para acciones primarias
- Tipografía: Inter o system font

---

## Prioridad de Implementación

1. **Auth** — login, registro, middleware, contexto de usuario
2. **Layout** — sidebar, header, protección de rutas
3. **POS** — punto de venta (core del negocio)
4. **Productos** — CRUD + variantes
5. **Inventario** — stock + ajustes
6. **Ventas** — historial + devoluciones
7. **Catálogo** — marcas, categorías, tallas
8. **Tiendas** — CRUD tiendas
9. **Dashboard** — resumen
10. **Usuarios** — gestión
