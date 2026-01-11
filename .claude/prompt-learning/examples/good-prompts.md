# Good Prompts

Ejemplos de prompts efectivos para este proyecto.

## Exploración

### Buscar archivos

```
Encuentra todos los archivos que manejan autenticación
```

```
¿Dónde está definido el servicio de sesiones?
```

### Entender código

```
Explica cómo funciona el streaming de respuestas en el WebSocket handler
```

```
¿Cuál es el flujo de datos desde que el usuario envía un prompt hasta que recibe la respuesta?
```

## Implementación

### Nuevo endpoint

```
Añade un endpoint GET /api/sessions/:id/export que exporte una sesión en formato JSON o Markdown según el query param format
```

### Refactoring

```
Refactoriza el servicio de Claude para separar la lógica de SDK y CLI en métodos privados distintos
```

### Bug fix

```
El WebSocket se desconecta después de 30 segundos de inactividad. Implementa keep-alive con ping/pong cada 25 segundos
```

## Testing

### Crear tests

```
Crea tests para el servicio de memoria que cubran: búsqueda exitosa, búsqueda sin resultados, y manejo de errores
```

### Ejecutar tests

```
Corre los tests del servicio de autenticación y muestra los que fallan
```

## Review

### Code review

```
Revisa los cambios en src/services/claude.ts para problemas de seguridad, performance y mantenibilidad
```

### Security audit

```
Audita el módulo de autenticación para vulnerabilidades OWASP Top 10
```

## Patterns Efectivos

| Pattern | Ejemplo |
|---------|---------|
| Específico | "Añade validación de email en el endpoint /api/users" |
| Con contexto | "En el archivo auth.ts, el token no se está refrescando correctamente cuando..." |
| Con criterio de éxito | "...el test debe pasar y el coverage debe ser >80%" |
| Con restricciones | "...sin añadir nuevas dependencias" |
