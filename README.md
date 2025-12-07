# Sistema de Gestión de Horarios - Frontend

Aplicación web moderna desarrollada con React, TypeScript y Vite para la gestión y visualización de horarios académicos de La Pontificia.

## 📋 Tabla de Contenidos

- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Ejecución del Sistema](#ejecución-del-sistema)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Tecnologías Utilizadas](#tecnologías-utilizadas)
- [Rutas y Funcionalidades](#rutas-y-funcionalidades)
- [Comandos Útiles](#comandos-útiles)

## 🏗️ Arquitectura del Sistema

El frontend utiliza una **arquitectura moderna basada en componentes** con las siguientes características:

### Arquitectura Frontend

```
┌─────────────────────────────────────────────────────┐
│              React Application (SPA)                 │
│  ┌──────────────────────────────────────────────┐  │
│  │         React Router (Routing)               │  │
│  │  ┌────────────────────────────────────────┐ │  │
│  │  │   Context API (Auth, Theme)            │ │  │
│  │  └────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────┐ │  │
│  │  │   TanStack Query (Server State)        │ │  │
│  │  └────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────┐ │  │
│  │  │   Componentes (Shadcn/ui + Custom)    │ │  │
│  │  └────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────┘  │
└───────────────────┬─────────────────────────────────┘
                    │ HTTP/REST (Axios)
                    │ JWT Authentication
                    │
┌───────────────────▼─────────────────────────────────┐
│         Django REST Framework API                   │
│         (Backend - Puerto 8000)                     │
└─────────────────────────────────────────────────────┘
```

### Características de la Arquitectura

1. **Single Page Application (SPA)**: Navegación sin recargar página
2. **Component-Based Architecture**: Componentes reutilizables y modulares
3. **State Management**: 
   - Context API para estado global (Auth, Theme)
   - TanStack Query para estado del servidor
   - React Hooks para estado local
4. **Type Safety**: TypeScript para tipado estático
5. **Modern Build Tool**: Vite para desarrollo rápido y builds optimizados
6. **UI Component Library**: Shadcn/ui basado en Radix UI
7. **Styling**: Tailwind CSS con sistema de diseño personalizado

### Flujo de Autenticación

```
Usuario → Login → JWT Token → Context API → Protected Routes
                ↓
         localStorage (Persistencia)
                ↓
    Axios Interceptor (Auto-attach token)
```

### Sistema de Roles

- **Administrador**: Acceso completo al sistema
- **Docente**: Acceso limitado a su disponibilidad y horarios

## 📦 Requisitos

### Software Necesario

- **Node.js**: 18.0 o superior
- **npm**: 9.0 o superior (o yarn/pnpm)
- **Git**: Para clonar el repositorio

### Dependencias Principales

- React 18.3.1
- TypeScript 5.5.3
- Vite 5.4.1
- React Router DOM 6.26.2
- TanStack Query 5.56.2
- Axios 1.9.0
- Tailwind CSS 3.4.11
- Shadcn/ui (Radix UI)

## 🚀 Instalación

### 1. Clonar el Repositorio

```bash
git clone https://github.com/Rudeus000/istema-horario-frontend.git
cd sistema-horario-frontend
```

### 2. Instalar Dependencias

```bash
npm install
```

O con yarn:
```bash
yarn install
```

O con pnpm:
```bash
pnpm install
```

### 3. Configurar Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
# URL del backend API
VITE_API_URL=http://localhost:8000/api/
```

O crear `.env.local` para desarrollo local:
```env
VITE_API_URL=http://localhost:8000/api/
```

## ⚙️ Configuración

### Configuración de Vite

El proyecto está configurado para ejecutarse en el puerto **8080** por defecto. Puedes cambiar esto en `vite.config.ts`:

```typescript
server: {
  host: "::",
  port: 8080,  // Cambiar aquí
}
```

### Configuración de TypeScript

El proyecto usa TypeScript con configuración flexible para desarrollo rápido. Los paths están configurados con el alias `@/` para importaciones desde `src/`.

### Configuración de Tailwind CSS

Tailwind está configurado con un sistema de diseño personalizado que incluye:
- Modo oscuro/claro
- Colores personalizados
- Componentes de Shadcn/ui
- Animaciones

## 🏃 Ejecución del Sistema

### Desarrollo

```bash
npm run dev
```

El servidor de desarrollo estará disponible en: `http://localhost:8080`

### Build para Producción

```bash
npm run build
```

Esto generará los archivos optimizados en la carpeta `dist/`.

### Preview de Producción

Para probar el build de producción localmente:

```bash
npm run preview
```

### Linting

```bash
npm run lint
```

## 📁 Estructura del Proyecto

```
sistema-horario-frontend/
├── public/                    # Archivos estáticos
│   ├── image/                 # Imágenes (logos, portadas)
│   └── favicon.ico
│
├── src/
│   ├── components/            # Componentes reutilizables
│   │   ├── ui/                # Componentes de Shadcn/ui
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ... (50+ componentes)
│   │   ├── AsignacionModal.tsx
│   │   ├── DataTable.tsx
│   │   ├── HorarioGrid.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── Sidebar.tsx
│   │
│   ├── contexts/              # Context API
│   │   ├── AuthContext.tsx    # Autenticación y roles
│   │   └── ThemeContext.tsx  # Tema claro/oscuro
│   │
│   ├── hooks/                 # Custom Hooks
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   │
│   ├── layouts/               # Layouts de la aplicación
│   │   └── AppLayout.tsx
│   │
│   ├── pages/                 # Páginas/Vistas
│   │   ├── Login.tsx
│   │   ├── DashboardAdmin.tsx
│   │   ├── DashboardDocente.tsx
│   │   ├── HorarioAuto.tsx
│   │   ├── HorarioManual.tsx
│   │   ├── Docentes.tsx
│   │   ├── Materias.tsx
│   │   └── ... (20+ páginas)
│   │
│   ├── types/                 # Definiciones TypeScript
│   │   ├── index.ts
│   │   └── periodoAcademico.ts
│   │
│   ├── utils/                 # Utilidades
│   │   ├── axiosClient.ts     # Cliente HTTP configurado
│   │   └── crudHelpers.ts    # Helpers para CRUD
│   │
│   ├── lib/                   # Librerías
│   │   └── utils.ts           # Utilidades generales
│   │
│   ├── App.tsx                # Componente raíz y rutas
│   ├── main.tsx               # Punto de entrada
│   └── index.css              # Estilos globales
│
├── components.json            # Configuración Shadcn/ui
├── tailwind.config.ts         # Configuración Tailwind
├── tsconfig.json              # Configuración TypeScript
├── vite.config.ts             # Configuración Vite
└── package.json               # Dependencias y scripts
```

## 🛠️ Tecnologías Utilizadas

### Core
- **React 18.3.1**: Biblioteca UI
- **TypeScript 5.5.3**: Tipado estático
- **Vite 5.4.1**: Build tool y dev server

### Routing
- **React Router DOM 6.26.2**: Enrutamiento SPA

### State Management
- **TanStack Query 5.56.2**: Manejo de estado del servidor
- **Context API**: Estado global (Auth, Theme)
- **React Hooks**: Estado local

### UI/UX
- **Shadcn/ui**: Sistema de componentes
- **Radix UI**: Componentes accesibles base
- **Tailwind CSS 3.4.11**: Framework CSS utility-first
- **Framer Motion 12.12.1**: Animaciones
- **Lucide React**: Iconos
- **Sonner**: Notificaciones toast

### Forms & Validation
- **React Hook Form 7.53.0**: Manejo de formularios
- **Zod 3.23.8**: Validación de esquemas
- **@hookform/resolvers**: Integración Zod + React Hook Form

### HTTP Client
- **Axios 1.9.0**: Cliente HTTP con interceptors

### Data Visualization
- **Recharts 2.7.2**: Gráficos y visualización
- **@dnd-kit/core**: Drag and drop

### Utilities
- **date-fns 3.6.0**: Manipulación de fechas
- **xlsx 0.18.5**: Exportación a Excel
- **file-saver 2.0.5**: Descarga de archivos
- **next-themes 0.3.0**: Manejo de temas

## 🗺️ Rutas y Funcionalidades

### Rutas Públicas
- `/` - Selección de rol
- `/login` - Inicio de sesión
- `/unauthorized` - Acceso no autorizado

### Rutas de Administrador
- `/dashboard-admin` - Dashboard principal
- `/admin/unidades` - Gestión de unidades académicas
- `/admin/unidades/:id/carreras` - Carreras por unidad
- `/admin/carreras/:id/materias` - Materias por carrera
- `/admin/usuarios` - Gestión de usuarios
- `/admin/docentes` - Gestión de docentes
- `/admin/aulas` - Gestión de aulas
- `/admin/grupos` - Gestión de grupos
- `/admin/disponibilidad` - Disponibilidad de docentes
- `/admin/horarios/manual` - Asignación manual de horarios
- `/admin/horarios/automatico` - Generación automática
- `/admin/reportes` - Reportes y exportación
- `/admin/restricciones` - Configuración de restricciones
- `/admin/ciclos` - Gestión de ciclos
- `/admin/periodos-academicos` - Períodos académicos

### Rutas de Docente
- `/dashboard-docente` - Dashboard del docente
- `/docente/disponibilidad` - Mi disponibilidad
- `/docente/horario` - Mi horario asignado
- `/docente/exportar` - Exportar mi horario

## 📝 Comandos Útiles

### Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# Build para desarrollo
npm run build:dev

# Linting
npm run lint
```

### Producción

```bash
# Build optimizado
npm run build

# Preview del build
npm run preview
```

### Instalación de Componentes Shadcn/ui

```bash
# Agregar nuevo componente
npx shadcn-ui@latest add [component-name]
```

## 🔐 Autenticación

El sistema utiliza **JWT (JSON Web Tokens)** para autenticación:

1. **Login**: El usuario inicia sesión y recibe tokens
2. **Almacenamiento**: Tokens guardados en `localStorage`
3. **Interceptor**: Axios automáticamente agrega el token a las peticiones
4. **Refresh**: Renovación automática de tokens cuando expiran
5. **Protección**: Rutas protegidas con `ProtectedRoute`

### Flujo de Autenticación

```typescript
// Login
const { login } = useAuth();
await login(username, password);

// Token automático en peticiones
client.get('/endpoint'); // Token agregado automáticamente

// Logout
const { logout } = useAuth();
logout();
```

## 🎨 Sistema de Diseño

### Tema Claro/Oscuro

El sistema incluye soporte para modo claro y oscuro:

```typescript
import { useTheme } from '@/contexts/ThemeContext';

const { theme, setTheme } = useTheme();
```

### Componentes UI

Todos los componentes están basados en Shadcn/ui y son:
- **Accesibles**: Cumplen con estándares WCAG
- **Personalizables**: Fácilmente modificables
- **Responsive**: Adaptables a diferentes tamaños de pantalla
- **Type-safe**: Completamente tipados con TypeScript

## 🔄 Integración con Backend

### Configuración de API

El cliente Axios está configurado en `src/utils/axiosClient.ts`:

- **Base URL**: Configurable mediante `VITE_API_URL`
- **Interceptors**: Manejo automático de tokens y errores
- **Error Handling**: Manejo centralizado de errores HTTP

### Ejemplo de Uso

```typescript
import client from '@/utils/axiosClient';

// GET request
const response = await client.get('/scheduling/grupos/');

// POST request
const newGroup = await client.post('/scheduling/grupos/', {
  codigo_grupo: 'GRP001',
  materia: 1,
  // ...
});
```

## 🐛 Solución de Problemas

### Error de CORS

Si encuentras errores de CORS, verifica que:
1. El backend esté ejecutándose en `http://localhost:8000`
2. El backend tenga configurado `CORS_ALLOWED_ORIGINS` con `http://localhost:8080`
3. La variable `VITE_API_URL` esté correctamente configurada

### Error de Autenticación

1. Verifica que el token esté en `localStorage`
2. Revisa la consola del navegador para errores
3. Intenta hacer logout y login nuevamente

### Error de Build

```bash
# Limpiar cache y reinstalar
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Puerto en Uso

Si el puerto 8080 está en uso, cambia el puerto en `vite.config.ts`:

```typescript
server: {
  port: 3000, // Cambiar aquí
}
```

## 📊 Performance

### Optimizaciones Implementadas

- **Code Splitting**: Carga lazy de componentes
- **Tree Shaking**: Eliminación de código no usado
- **Minificación**: Código optimizado en producción
- **Caching**: TanStack Query cachea peticiones
- **Lazy Loading**: Carga diferida de rutas

### Métricas

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Bundle Size**: Optimizado con Vite

## 🧪 Testing

```bash
# Ejecutar tests (si están configurados)
npm test

# Coverage
npm run test:coverage
```

## 📄 Licencia

Este proyecto es privado y pertenece a La Pontificia.

## 👥 Contribuidores

- Rudeus000
- AndreMendezCisneros

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025
