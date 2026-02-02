# Prompt Examples

Ejemplos de transformación de prompts vagos a actionables.

## Ejemplo 1: API

### Antes (Score: 30)
> "Hacer login"

### Después (Score: 85)
> "Crear endpoint POST /api/auth/login que:
> - Reciba { email: string, password: string }
> - Valide email formato válido, password min 8 chars
> - Compare password hasheado con bcrypt
> - Retorne 200 con { token: JWT, user: UserDTO } o 401"

## Ejemplo 2: Database

### Antes (Score: 25)
> "Agregar campo al usuario"

### Después (Score: 80)
> "Añadir campo `lastLoginAt: timestamp | null` a tabla users:
> - Migration up: ALTER TABLE ADD COLUMN
> - Migration down: ALTER TABLE DROP COLUMN  
> - Default: null para usuarios existentes
> - Índice: No requerido"

## Ejemplo 3: Refactoring

### Antes (Score: 20)
> "Limpiar el código"

### Después (Score: 85)
> "Refactorizar `processOrder()` en src/services/order.ts:
> - Extraer validación a `validateOrder()`
> - Extraer cálculo a `calculateTotal()`
> - Mantener firma pública igual
> - Tests existentes deben pasar"

## Ejemplo 4: Testing

### Antes (Score: 35)
> "Agregar tests"

### Después (Score: 80)
> "Añadir tests para `UserService.create()`:
> - Unit: email duplicado retorna error
> - Unit: password se hashea correctamente
> - Integration: usuario se guarda en DB
> - Mock: EmailService.sendWelcome()"

## Ejemplo 5: WebSocket

### Antes (Score: 30)
> "Hacer chat en tiempo real"

### Después (Score: 85)
> "Implementar WebSocket /ws/chat que:
> - Auth: JWT en query param `?token=`
> - Mensaje entrada: { type: 'message', content: string, roomId: string }
> - Broadcast: a todos los usuarios en el mismo roomId
> - Eventos: 'user_joined', 'user_left', 'message'"
