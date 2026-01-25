# Complexity Routing Rule

Calcular complejidad antes de delegar para determinar si requiere planner.

## Factores de Complejidad

| Factor | Peso | Low (1) | Medium (2) | High (3) |
|--------|------|---------|------------|----------|
| **Archivos** | 20% | 1-2 | 3-5 | 6+ |
| **Dominios** | 20% | 1 | 2-3 | 4+ |
| **Dependencias** | 20% | 0-1 | 2-3 | 4+ |
| **Seguridad** | 20% | Ninguna | Data | Auth/Crypto |
| **Integraciones** | 20% | 0-1 | 2-3 | 4+ |

## Calculo

```
score = Σ (factor_value × peso × 20)
```

Ejemplo:
- Archivos: 3-5 (Medium = 2) × 20% × 20 = 8
- Dominios: 2-3 (Medium = 2) × 20% × 20 = 8
- Dependencias: 0-1 (Low = 1) × 20% × 20 = 4
- Seguridad: Ninguna (Low = 1) × 20% × 20 = 4
- Integraciones: 0-1 (Low = 1) × 20% × 20 = 4
- **Total: 28**

## Routing por Complejidad

| Score | Routing | Razon |
|-------|---------|-------|
| **< 30** | builder directo | Tarea simple, sin planificacion |
| **30-60** | planner opcional | Considerar plan si hay incertidumbre |
| **> 60** | planner obligatorio | Requiere roadmap estructurado |

## Ejemplos

### Complejidad Baja (< 30)
> "Anadir validacion de email al endpoint de registro"

- Archivos: 1-2 → 4
- Dominios: 1 → 4
- Dependencias: 1 → 4
- Seguridad: Data → 8
- Integraciones: 0 → 4
- **Total: 24** → builder directo

### Complejidad Alta (> 60)
> "Implementar sistema de autenticacion OAuth con Google y GitHub"

- Archivos: 6+ → 12
- Dominios: 4+ (auth, users, sessions, providers) → 12
- Dependencias: 4+ → 12
- Seguridad: Auth → 12
- Integraciones: 4+ → 12
- **Total: 60** → planner obligatorio

## Proceso

1. Analizar tarea del usuario
2. Evaluar cada factor
3. Calcular score total
4. Rutear segun umbral
