# Claude Code Poneglyph

## ¿Para quién es?

Este proyecto es una herramienta **personal** para **Oriol Macias**.
No es un producto comercial ni un SaaS.

El objetivo es maximizar la productividad de un programador trabajando junto a Claude Code como **co-programador**.

> **Filosofía:** Claude no reemplaza al programador, lo amplifica.

---

## ¿Qué es?

**Claude Code Poneglyph** es una interfaz web para trabajar con Claude Code (la herramienta de programación de Anthropic). Transforma la experiencia de línea de comandos en una aplicación visual con capacidades de orquestación y observabilidad.

> **En resumen:** Es como tener un "Control de Misión" para tus agentes de IA de programación.

---

## El Problema que Resuelve

| Problema con CLI tradicional | Solución en Poneglyph |
|------------------------------|----------------------|
| Terminal sin contexto visual | Interfaz web con streaming en tiempo real |
| Historial de conversaciones efímero | Sesiones persistentes con memoria |
| Un solo agente trabajando | Orquestación multi-agente con especialistas |
| Sin métricas de uso | Monitoreo de tokens, tiempo y contexto |
| Permisos manuales en cada acción | Modos configurables (bypass, plan, etc.) |

---

## ¿Cómo Funciona?

### Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Chat UI   │  │  Session    │  │   Metrics   │     │
│  │  Streaming  │  │  Manager    │  │   Display   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└────────────────────────┬────────────────────────────────┘
                         │ WebSocket + HTTP
┌────────────────────────▼────────────────────────────────┐
│                   BACKEND (Bun + Elysia)                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Orchestrator│  │   Claude    │  │   Memory    │     │
│  │   Agent     │  │   Service   │  │   Store     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└────────────────────────┬────────────────────────────────┘
                         │ CLI Spawn / SDK
┌────────────────────────▼────────────────────────────────┐
│                    CLAUDE CODE                          │
│            (Modelo de IA de Anthropic)                  │
└─────────────────────────────────────────────────────────┘
```

### Flujo de Trabajo

1. **Crear Sesión**: El usuario crea una nueva sesión de trabajo asociada a un directorio.
2. **Enviar Prompt**: El mensaje se envía al backend vía WebSocket.
3. **Orquestación**: El backend decide si usar modo directo o delegar a agentes especializados.
4. **Streaming**: Las respuestas llegan en tiempo real al frontend.
5. **Persistencia**: Cada conversación se guarda para continuar después.

---

## Características Principales

### 1. Chat con Streaming en Tiempo Real
La interfaz muestra las respuestas de Claude mientras se generan, incluyendo:
- Texto formateado con Markdown
- Bloques de código con syntax highlighting
- Indicadores de herramientas usadas (lectura de archivos, ejecución de comandos)
- Imágenes pegadas directamente en el chat

### 2. Modos de Operación

| Modo | Descripción | Cuándo usarlo |
|------|-------------|---------------|
| **Orchestrate** | Claude delega tareas a agentes especializados | Proyectos complejos multi-archivo |
| **Plan Mode** | Claude solo planifica, no ejecuta | Revisión de estrategia antes de actuar |
| **Bypass Permissions** | Salta confirmaciones de permisos | Desarrollo rápido (con precaución) |
| **Allow Full PC** | Permite acceso completo al sistema | Tareas administrativas del sistema |

### 3. Sistema de Sesiones
- **Múltiples sesiones** activas simultáneamente
- **Historial persistente** de cada conversación
- **Directorio de trabajo** configurable por sesión
- **Restauración automática** del contexto previo

### 4. Panel de Contexto
Visualiza en tiempo real:
- Agente activo (si hay orquestación)
- Skills activadas
- Herramientas en uso
- Estado del proceso

### 5. Métricas y Observabilidad
- **Indicador de Context Window**: Muestra cuántos tokens quedan disponibles
- **Contador de mensajes**: Estadísticas de la sesión
- **Tiempo de respuesta**: Latencia de cada interacción
- **Uso de tokens**: Desglose por input/output

---

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Runtime** | Bun 1.x |
| **Backend** | Elysia (framework HTTP/WS) |
| **Frontend** | React 18 + Vite |
| **Estilos** | TailwindCSS |
| **Comunicación** | WebSocket para streaming, HTTP para REST |
| **IA** | Claude Code (Anthropic) vía CLI spawn o SDK |

---

## Cómo Iniciar

### Requisitos
- Bun 1.x instalado
- Claude Code CLI configurado (`claude` disponible en PATH)
- API Key de Anthropic configurada

### Comandos

```bash
# Clonar el repositorio
git clone <repo-url>
cd claude-code-poneglyph

# Instalar dependencias
cd claude-code-ui/server && bun install
cd ../web && bun install

# Iniciar en desarrollo
# Terminal 1 - Backend
cd claude-code-ui/server && bun run dev

# Terminal 2 - Frontend
cd claude-code-ui/web && bun run dev

# Abrir en navegador
# http://localhost:5173
```

---

## Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/health` | Estado del servidor |
| `GET` | `/api/sessions` | Listar sesiones |
| `POST` | `/api/sessions` | Crear nueva sesión |
| `GET` | `/api/sessions/:id` | Obtener sesión específica |
| `POST` | `/api/execute` | Ejecutar prompt (SDK mode) |
| `POST` | `/api/execute-cli` | Ejecutar prompt (CLI spawn) |
| `WS` | `/ws` | WebSocket para streaming |

---

## Diferencia con otras herramientas

| Característica | CLI Tradicional | Cursor/Windsurf | **Poneglyph** |
|----------------|-----------------|-----------------|---------------|
| Interfaz | Terminal | Editor integrado | Web standalone |
| Multi-agente | ❌ | ❌ | ✅ Orquestación |
| Sesiones persistentes | ❌ | Parcial | ✅ Completo |
| Observabilidad | ❌ | Básica | ✅ Métricas detalladas |
| Open source | ✅ | ❌ | ✅ |

---

## Próximos Pasos

1. **Modo Visual (Kanban)**: Ver tareas como tarjetas en un tablero
2. **Terminal Grid**: Múltiples terminales de agentes en paralelo
3. **Git Worktrees**: Aislar cambios por tarea automáticamente
4. **Agentes Expertos**: Revisor de calidad y optimizador de rendimiento integrados
