# Successful Repository Patterns

Patrones extraidos de repositorios open source exitosos (>1k stars).

## Project Structure

### bulletproof-react (23k+ stars)

```
src/
├── app/          # App-level setup (providers, routes)
├── components/   # Shared UI components
├── features/     # Feature-based modules
│   └── users/
│       ├── api/
│       ├── components/
│       ├── hooks/
│       └── types/
├── hooks/        # Shared hooks
├── lib/          # External library configs
├── stores/       # Global state
├── types/        # Shared types
└── utils/        # Utility functions
```

**Key Pattern**: Feature-based organization over type-based

### trpc (32k+ stars)

```
packages/
├── client/
├── server/
├── react-query/
└── core/
```

**Key Pattern**: Monorepo with clear package boundaries

## API Patterns

### tRPC - Type-safe APIs

```typescript
// Define router with procedures
const userRouter = router({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => getUserById(input.id)),

  create: protectedProcedure
    .input(createUserSchema)
    .mutation(({ input }) => createUser(input))
})
```

### hono (14k+ stars) - Lightweight Web Framework

```typescript
const app = new Hono()

app.route('/api/users', userRoutes)
app.route('/api/posts', postRoutes)

// Middleware chain
app.use('*', cors(), logger(), auth())
```

## State Management

### zustand (40k+ stars)

```typescript
// Simple store
const useStore = create<Store>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set({ count: 0 })
}))

// With middleware
const useStore = create(
  persist(
    devtools((set) => ({ ... })),
    { name: 'store' }
  )
)
```

### jotai (16k+ stars)

```typescript
// Atomic state
const countAtom = atom(0)
const doubledAtom = atom((get) => get(countAtom) * 2)

// Usage
const [count, setCount] = useAtom(countAtom)
```

## Error Handling

### neverthrow (3k+ stars)

```typescript
import { ok, err, Result } from 'neverthrow'

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return err('Division by zero')
  return ok(a / b)
}

// Usage
divide(10, 2)
  .map(result => result * 2)
  .mapErr(error => console.error(error))
```

## Validation

### zod (28k+ stars)

```typescript
const UserSchema = z.object({
  email: z.string().email(),
  age: z.number().min(18),
  role: z.enum(['user', 'admin'])
})

type User = z.infer<typeof UserSchema>

// Parse with errors
const result = UserSchema.safeParse(data)
if (!result.success) {
  console.log(result.error.flatten())
}
```

## Testing Patterns

### testing-library (18k+ stars)

```typescript
// User-centric queries
render(<Component />)

// Prefer accessible queries
const button = screen.getByRole('button', { name: /submit/i })
const input = screen.getByLabelText(/email/i)

// User events
await userEvent.click(button)
await userEvent.type(input, 'test@example.com')
```

## Common Patterns

| Pattern | Used By | Description |
|---------|---------|-------------|
| Feature folders | bulletproof-react | Co-locate by domain |
| Barrel exports | Most repos | `index.ts` re-exports |
| Zod schemas | tRPC, Elysia | Runtime + static types |
| Result types | neverthrow | Explicit error handling |
| Atomic state | jotai, zustand | Fine-grained reactivity |

## Anti-Patterns from Real Issues

| Repo | Issue | Lesson |
|------|-------|--------|
| lodash | Bundle size | Tree-shake, use native |
| moment | Mutable | Use date-fns/dayjs |
| classnames | Overhead | Use clsx instead |

## Sources

- [bulletproof-react](https://github.com/alan2207/bulletproof-react)
- [tRPC](https://github.com/trpc/trpc)
- [zustand](https://github.com/pmndrs/zustand)
- [zod](https://github.com/colinhacks/zod)
- [neverthrow](https://github.com/supermacro/neverthrow)
