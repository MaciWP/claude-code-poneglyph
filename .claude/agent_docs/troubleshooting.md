# Troubleshooting

## Common Errors

### ECONNREFUSED on startup

**Síntomas**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Causa**: PostgreSQL no está corriendo

**Solución**:
```bash
# Con Docker
docker compose up -d postgres

# Verificar
docker ps | grep postgres
```

---

### Claude CLI not found

**Síntomas**:
```
Error: spawn claude ENOENT
```

**Causa**: Claude Code CLI no instalado o no en PATH

**Solución**:
```bash
# Instalar Claude Code
npm install -g @anthropic-ai/claude-code

# Verificar
claude --version

# Si sigue fallando, verificar PATH
which claude
```

---

### JWT Token Expired

**Síntomas**:
```json
{ "error": "Token expired", "code": "JWT_EXPIRED" }
```

**Causa**: Access token expirado

**Solución**:
```typescript
// Usar refresh token
const newToken = await refreshToken(currentRefreshToken)

// O re-login
await login(credentials)
```

---

### WebSocket Connection Failed

**Síntomas**:
```
WebSocket connection to 'ws://localhost:8080/ws' failed
```

**Causa**: Backend no corriendo o CORS

**Solución**:
```bash
# 1. Verificar backend
curl http://localhost:8080/api/health

# 2. Si CORS, verificar config
# server/src/index.ts
app.use(cors({
  origin: ['http://localhost:5173']
}))
```

---

### Bun Test Failures

**Síntomas**:
```
error: Cannot find module './service'
```

**Causa**: Paths relativos incorrectos o módulo no exportado

**Solución**:
```typescript
// Verificar exports en index.ts
export { UserService } from './service'

// Verificar import
import { UserService } from '../services/user'  // No './user'
```

---

### Memory Search Returns Empty

**Síntomas**:
```json
{ "results": [] }
```

**Causa**: No hay embeddings o threshold muy alto

**Solución**:
```typescript
// Bajar threshold
const results = await memorySearch({
  query: 'search term',
  threshold: 0.5,  // Default es 0.7, bajar si necesario
  limit: 10
})

// Verificar que hay datos
await memoryStore({ content: 'test', metadata: {} })
```

---

### Type Errors After Update

**Síntomas**:
```
TS2339: Property 'x' does not exist on type 'Y'
```

**Causa**: Types desactualizados después de cambio

**Solución**:
```bash
# Regenerar types
bun run typecheck

# Si persiste, limpiar cache
rm -rf node_modules/.cache
bun install
```

---

## Debug Commands

```bash
# Logs del servidor
bun run dev 2>&1 | tee server.log

# Health check
curl -s http://localhost:8080/api/health | jq

# Test específico
bun test src/services/claude.test.ts --watch

# Verificar env vars
bun -e "console.log(Bun.env)"
```

## Performance Issues

### Slow Responses

**Causa**: Modelo muy grande o timeout bajo

**Solución**:
```typescript
// Usar modelo más rápido para tareas simples
const result = await execute({
  prompt,
  model: 'claude-3-haiku-20240307'  // Más rápido
})

// Aumentar timeout
const result = await execute({
  prompt,
  timeout: 120000  // 2 minutos
})
```

### Memory Leaks

**Causa**: Event listeners no limpiados

**Solución**:
```typescript
// Limpiar listeners
useEffect(() => {
  const handler = (e) => { /* ... */ }
  ws.addEventListener('message', handler)

  return () => {
    ws.removeEventListener('message', handler)
  }
}, [])
```
