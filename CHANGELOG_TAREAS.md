# 📝 Blog de Notas - Cambios Pendientes del Sistema de Horarios

**Fecha de creación**: 7 de Diciembre, 2025  
**Estado**: Pendiente  
**Equipo**: Desarrollo Sistema de Horarios - La Pontificia

---

## 🎯 Resumen Ejecutivo

Este documento contiene todas las tareas y mejoras pendientes que el equipo de desarrollo debe implementar en el Sistema de Gestión de Horarios. Las tareas están organizadas por módulos y prioridad.

---

## 📋 Tabla de Contenidos

1. [Frontend - Página de Horarios Manuales](#1-frontend---página-de-horarios-manuales)
2. [Frontend - Módulo de Reportes](#2-frontend---módulo-de-reportes)
3. [Backend - Migración a Supabase](#3-backend---migración-a-supabase)
4. [Backend - Carga Masiva desde Excel](#4-backend---carga-masiva-desde-excel)

---

## 1. Frontend - Página de Horarios Manuales

### 📍 Ubicación
- **Archivo**: `src/pages/HorarioManual.tsx`
- **Ruta**: `/admin/horarios/manual`

### ✅ Tareas a Implementar

#### 1.1. Sistema de Notas Post-it (Estilo IKEA)
- [ ] **Agregar componente de notas tipo post-it IKEA**
  - Diseño visual similar a los post-it de IKEA (colores pastel, bordes redondeados)
  - Posicionamiento flotante en la página
  - Múltiples notas simultáneas
  - Funcionalidad de arrastrar y soltar (drag & drop)
  - Persistencia de notas en localStorage o estado global
  
- [ ] **Funcionalidades de las notas**:
  - Crear nueva nota
  - Editar nota existente
  - Eliminar nota
  - Cambiar color de la nota
  - Minimizar/maximizar nota
  - Fijar nota en posición específica

#### 1.2. Horario en Tiempo Real
- [ ] **Implementar visualización de horario en tiempo real**
  - Mostrar el horario actual mientras se están haciendo cambios
  - Actualización automática sin necesidad de recargar la página
  - Indicadores visuales de cambios en progreso
  
- [ ] **Sistema de cambios en tiempo real**:
  - Mostrar qué cambios se están haciendo en el horario
  - Lista de cambios pendientes (queue de cambios)
  - Indicador de estado: "Guardando...", "Cambio aplicado", "Error"
  - Historial de cambios recientes (últimos 10-15 cambios)
  - Botón para deshacer último cambio
  - Botón para deshacer todos los cambios no guardados

#### 1.3. Indicadores Visuales de Cambios
- [ ] **Sistema de feedback visual**:
  - Resaltar celdas que han sido modificadas
  - Mostrar tooltip con información del cambio realizado
  - Animación suave al aplicar cambios
  - Color coding:
    - 🟢 Verde: Cambio guardado exitosamente
    - 🟡 Amarillo: Cambio pendiente de guardar
    - 🔴 Rojo: Error al guardar cambio
    - 🔵 Azul: Cambio en progreso

#### 1.4. Integración con Backend
- [ ] **API endpoints necesarios**:
  - `GET /api/scheduling/horarios-asignados/?periodo={id}` - Obtener horario actual
  - `POST /api/scheduling/horarios-asignados/` - Crear nueva asignación
  - `PATCH /api/scheduling/horarios-asignados/{id}/` - Actualizar asignación
  - `DELETE /api/scheduling/horarios-asignados/{id}/` - Eliminar asignación
  - `GET /api/scheduling/horarios-asignados/historial/` - Obtener historial de cambios

### 📝 Notas Técnicas
- Usar WebSockets o polling para actualización en tiempo real
- Considerar usar React Query para manejo de estado del servidor
- Implementar optimistic updates para mejor UX
- Agregar debounce a las peticiones para evitar spam al servidor

---

## 2. Frontend - Módulo de Reportes

### 📍 Ubicación
- **Archivo**: `src/pages/ReportesHorarios.tsx`
- **Ruta**: `/admin/reportes`

### ✅ Tareas a Implementar

#### 2.1. Optimización de Impresión de Horarios
- [ ] **Reducir cantidad de horarios por PDF**
  - **Problema actual**: Se generan 4 horarios por PDF
  - **Solución requerida**: Generar solo 1 horario por PDF
  - Implementar opción para seleccionar qué horario imprimir
  - Agregar selector de horario antes de generar PDF
  
- [ ] **Mejoras en la generación de PDF**:
  - Optimizar tamaño del PDF
  - Mejorar formato y legibilidad
  - Agregar opción de vista previa antes de descargar
  - Permitir descargar múltiples PDFs individuales en un ZIP

#### 2.2. Documentación de Filtros
- [ ] **Crear documentación de filtros funcionales y no funcionales**
  - Listar todos los filtros disponibles en la página
  - Marcar claramente cuáles funcionan y cuáles no
  - Agregar indicadores visuales:
    - ✅ Filtro funcional
    - ❌ Filtro no funcional
    - ⚠️ Filtro con problemas conocidos
  
- [ ] **Filtros a documentar**:
  - [ ] Filtro por período académico
  - [ ] Filtro por carrera
  - [ ] Filtro por docente
  - [ ] Filtro por materia
  - [ ] Filtro por aula/espacio
  - [ ] Filtro por día de la semana
  - [ ] Filtro por turno (mañana/tarde/noche)
  - [ ] Filtro por rango de fechas
  - [ ] Otros filtros existentes

#### 2.3. Corrección de Filtros No Funcionales
- [ ] **Identificar y corregir filtros que no funcionan**
  - Debuggear cada filtro individualmente
  - Verificar conexión con backend
  - Verificar que los parámetros se envíen correctamente
  - Probar cada filtro y documentar resultados
  - Corregir filtros rotos según prioridad

#### 2.4. Mejoras en la Interfaz de Filtros
- [ ] **Mejorar UX de los filtros**:
  - Agregar tooltips explicativos a cada filtro
  - Mostrar cantidad de resultados filtrados
  - Botón "Limpiar filtros"
  - Guardar preferencias de filtros en localStorage
  - Permitir combinar múltiples filtros

### 📝 Notas Técnicas
- Revisar implementación actual de filtros en `ReportesHorarios.tsx`
- Verificar endpoints del backend que soportan filtros
- Considerar usar React Hook Form para manejo de filtros complejos

---

## 3. Backend - Migración a Supabase

### 📍 Ubicación
- **Archivo**: `la_pontificia_horarios/settings.py`
- **Base de datos actual**: PostgreSQL local
- **Base de datos objetivo**: Supabase (PostgreSQL en la nube)

### ✅ Tareas a Implementar

#### 3.1. Configuración de Supabase
- [ ] **Crear proyecto en Supabase**
  - Crear cuenta/organización en Supabase
  - Crear nuevo proyecto
  - Obtener credenciales de conexión:
    - Database URL
    - API Key
    - Service Role Key
  
- [ ] **Configurar variables de entorno**:
  ```env
  # Supabase Database
  SUPABASE_URL=https://tu-proyecto.supabase.co
  SUPABASE_KEY=tu-api-key
  SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
  DB_NAME=postgres
  DB_USER=postgres
  DB_PASSWORD=tu-password
  DB_HOST=db.tu-proyecto.supabase.co
  DB_PORT=5432
  ```

#### 3.2. Migración de Base de Datos
- [ ] **Exportar base de datos local**
  - Hacer backup completo de la base de datos PostgreSQL local
  - Exportar schema (estructura de tablas)
  - Exportar datos (datos de las tablas)
  - Verificar integridad del backup
  
- [ ] **Importar a Supabase**
  - Conectar a Supabase usando psql o pgAdmin
  - Ejecutar scripts de migración de Django
  - Importar datos desde el backup
  - Verificar que todas las tablas se crearon correctamente
  - Verificar que todos los datos se importaron correctamente

#### 3.3. Actualización de Configuración Django
- [ ] **Modificar settings.py para usar Supabase**
  ```python
  DATABASES = {
      'default': {
          'ENGINE': 'django.db.backends.postgresql',
          'NAME': config('DB_NAME', default='postgres'),
          'USER': config('DB_USER', default='postgres'),
          'PASSWORD': config('DB_PASSWORD'),
          'HOST': config('DB_HOST'),
          'PORT': config('DB_PORT', default=5432),
          'OPTIONS': {
              'sslmode': 'require',  # Supabase requiere SSL
          },
      }
  }
  ```

- [ ] **Actualizar configuración de Redis (si aplica)**
  - Verificar si Supabase tiene Redis o usar servicio externo
  - Actualizar CELERY_BROKER_URL si es necesario

#### 3.4. Actualización de Frontend
- [ ] **Actualizar URL de API en frontend**
  - Modificar `VITE_API_URL` en `.env` del frontend
  - Actualizar `axiosClient.ts` si es necesario
  - Verificar que CORS esté configurado correctamente en Supabase

#### 3.5. Pruebas de Conexión
- [ ] **Probar conexión backend-Supabase**
  - Ejecutar `python manage.py migrate` para verificar conexión
  - Probar consultas básicas desde Django shell
  - Verificar que todas las apps funcionen correctamente
  
- [ ] **Probar conexión frontend-backend**
  - Verificar que las peticiones HTTP funcionen
  - Probar autenticación y autorización
  - Probar CRUD de todas las entidades principales

#### 3.6. Documentación de Migración
- [ ] **Documentar proceso de migración**
  - Crear guía paso a paso
  - Documentar problemas encontrados y soluciones
  - Crear script de rollback por si es necesario

### 📝 Notas Técnicas
- Supabase es compatible con PostgreSQL, por lo que la migración debería ser directa
- Asegurarse de que todas las dependencias de PostgreSQL estén instaladas
- Considerar usar connection pooling para mejor rendimiento
- Verificar límites de Supabase (filas, almacenamiento, etc.)

---

## 4. Backend - Carga Masiva desde Excel

### 📍 Ubicación
- **Nuevos archivos a crear**:
  - `apps/users/management/commands/cargar_docentes_excel.py`
  - `apps/academic_setup/management/commands/cargar_carreras_excel.py`
  - `apps/academic_setup/management/commands/cargar_grados_secciones_excel.py`
  - `apps/users/views.py` (agregar endpoints)
  - `apps/academic_setup/views.py` (agregar endpoints)

### ✅ Tareas a Implementar

#### 4.1. Carga Masiva de Docentes
- [ ] **Crear endpoint para carga de docentes**
  - `POST /api/users/docentes/cargar-excel/`
  - Aceptar archivo Excel (.xlsx, .xls)
  - Validar formato del archivo
  - Procesar datos y crear docentes en lote
  
- [ ] **Formato Excel requerido para docentes**:
  ```
  Columnas:
  - codigo_docente (requerido)
  - nombres (requerido)
  - apellidos (requerido)
  - dni (requerido, único)
  - email (requerido, único)
  - telefono (opcional)
  - tipo_contrato (opcional)
  - max_horas_semanales (opcional)
  - unidad_principal_id (opcional)
  - especialidades_ids (opcional, separado por comas)
  ```

- [ ] **Funcionalidades**:
  - Validación de datos antes de insertar
  - Reporte de errores (filas con problemas)
  - Reporte de éxito (docentes creados)
  - Opción de actualizar docentes existentes o solo crear nuevos
  - Procesamiento asíncrono con Celery para archivos grandes

#### 4.2. Carga Masiva de Carreras
- [ ] **Crear endpoint para carga de carreras**
  - `POST /api/academic/carreras/cargar-excel/`
  - Aceptar archivo Excel
  - Validar y procesar datos
  
- [ ] **Formato Excel requerido para carreras**:
  ```
  Columnas:
  - codigo_carrera (requerido)
  - nombre_carrera (requerido)
  - unidad_academica_id (requerido)
  - descripcion (opcional)
  - estado (opcional, true/false)
  ```

#### 4.3. Carga Masiva de Grados y Secciones
- [ ] **Crear endpoint para carga de grados y secciones**
  - `POST /api/academic/ciclos-secciones/cargar-excel/`
  - Aceptar archivo Excel
  - Validar y procesar datos
  
- [ ] **Formato Excel requerido para grados y secciones**:
  ```
  Columnas:
  - codigo_ciclo (requerido)
  - nombre_ciclo (requerido)
  - numero_ciclo (requerido)
  - codigo_seccion (requerido)
  - nombre_seccion (requerido)
  - carrera_id (requerido)
  ```

#### 4.4. Carga Masiva General (Otros)
- [ ] **Crear endpoint genérico para otras entidades**
  - Permitir carga masiva de:
    - Materias
    - Aulas/Espacios físicos
    - Grupos
    - Períodos académicos
    - Otros según necesidad

#### 4.5. Interfaz Frontend para Carga Masiva
- [ ] **Crear componente de carga masiva en frontend**
  - Componente de drag & drop para archivos
  - Vista previa de datos antes de cargar
  - Progreso de carga (barra de progreso)
  - Mostrar reporte de resultados (éxitos y errores)
  - Descargar plantilla Excel de ejemplo
  
- [ ] **Ubicaciones en frontend**:
  - Agregar botón "Cargar desde Excel" en:
    - Página de Docentes (`/admin/docentes`)
    - Página de Carreras (`/admin/unidades/:id/carreras`)
    - Página de Ciclos (`/admin/ciclos`)
    - Otras páginas según necesidad

#### 4.6. Validaciones y Manejo de Errores
- [ ] **Sistema de validación robusto**:
  - Validar formato de archivo
  - Validar columnas requeridas
  - Validar tipos de datos
  - Validar unicidad (DNI, email, códigos)
  - Validar relaciones (IDs de unidades, carreras, etc.)
  
- [ ] **Manejo de errores**:
  - Reporte detallado de errores por fila
  - Permitir descargar reporte de errores en Excel
  - Opción de reintentar solo las filas con errores
  - Logging de errores para debugging

#### 4.7. Plantillas Excel
- [ ] **Crear plantillas Excel de ejemplo**
  - Plantilla para docentes
  - Plantilla para carreras
  - Plantilla para grados y secciones
  - Incluir ejemplos de datos válidos
  - Incluir documentación en segunda hoja

### 📝 Notas Técnicas
- Usar librería `openpyxl` o `pandas` para leer archivos Excel
- Considerar usar Celery para procesar archivos grandes de forma asíncrona
- Implementar rate limiting para evitar abuso
- Validar tamaño máximo de archivo (ej: 10MB)
- Considerar usar streaming para archivos muy grandes

---

## 📊 Priorización de Tareas

### 🔴 Alta Prioridad
1. Migración a Supabase (crítico para producción)
2. Corrección de filtros en reportes (afecta funcionalidad core)
3. Optimización de impresión de PDFs (mejora UX importante)

### 🟡 Media Prioridad
4. Sistema de notas post-it en horarios manuales
5. Horario en tiempo real
6. Carga masiva de docentes

### 🟢 Baja Prioridad
7. Carga masiva de carreras y grados
8. Mejoras visuales adicionales
9. Documentación de filtros (puede hacerse en paralelo)

---

## 🧪 Criterios de Aceptación

### Para cada tarea completada:
- [ ] Código implementado y funcionando
- [ ] Pruebas unitarias (si aplica)
- [ ] Pruebas de integración
- [ ] Documentación actualizada
- [ ] Revisión de código completada
- [ ] Desplegado en ambiente de pruebas
- [ ] Aprobado por el equipo

---

## 📅 Estimaciones (Opcional)

| Tarea | Estimación | Asignado a |
|-------|------------|------------|
| Migración a Supabase | 3-5 días | |
| Filtros en reportes | 2-3 días | |
| PDFs individuales | 1-2 días | |
| Notas post-it | 2-3 días | |
| Horario tiempo real | 3-4 días | |
| Carga masiva docentes | 2-3 días | |
| Carga masiva carreras | 1-2 días | |

---

## 📝 Notas Adicionales

- Todas las tareas deben seguir las convenciones de código del proyecto
- Usar TypeScript en frontend, Python en backend
- Seguir principios de diseño responsive
- Considerar accesibilidad (WCAG) en nuevas funcionalidades
- Documentar APIs nuevas en el README correspondiente

---

## 🔄 Actualizaciones

**Versión 1.0** - 7 de Diciembre, 2025
- Documento inicial creado
- Todas las tareas documentadas

---

**Última actualización**: 7 de Diciembre, 2025  
**Mantenido por**: Equipo de Desarrollo - Sistema de Horarios La Pontificia

