# Corrections Log

Registro de correcciones aprendidas para mejorar accuracy.

## Formato

```markdown
## [FECHA] - [CATEGORÍA]

**Prompt original**: ...
**Error cometido**: ...
**Corrección**: ...
**Lección aprendida**: ...
```

---

## Correcciones Registradas

### 2025-01-09 - Model Selection

**Prompt original**: Usar agente scout
**Error cometido**: Usar model: haiku (no disponible)
**Corrección**: Cambiar a model: sonnet
**Lección aprendida**: haiku no está disponible en la API de agentes. Usar sonnet para agentes rápidos, opus para complejos.

---

### 2025-01-09 - Settings Validation

**Prompt original**: Añadir fileSuggestion: true
**Error cometido**: Schema requiere objeto, no boolean
**Corrección**: Eliminar la propiedad (formato incorrecto)
**Lección aprendida**: Verificar schema de settings.json antes de añadir propiedades nuevas.

---

### 2025-01-09 - PowerShell vs Bash

**Prompt original**: Eliminar archivos .DS_Store
**Error cometido**: Usar Get-ChildItem (PowerShell) en entorno bash
**Corrección**: Usar `rm -f` (bash)
**Lección aprendida**: En Windows con Git Bash, usar comandos Unix, no PowerShell.

---

## Categorías de Errores Comunes

| Categoría | Frecuencia | Prevención |
|-----------|------------|------------|
| Model selection | Alta | Verificar modelos disponibles |
| Schema validation | Media | Leer schema antes de editar config |
| Platform commands | Media | Detectar shell environment |
| Path separators | Baja | Usar path.join() |
| Encoding | Baja | Especificar UTF-8 |

## Checklist Pre-Implementación

- [ ] ¿El modelo existe y está disponible?
- [ ] ¿El schema del archivo de config lo permite?
- [ ] ¿Los comandos son compatibles con el shell?
- [ ] ¿Los paths usan el separador correcto?
- [ ] ¿Hay tests para el cambio?
