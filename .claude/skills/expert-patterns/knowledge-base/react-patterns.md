# React Modern Patterns

Best practices de React extraidos de documentacion oficial y blogs de expertos.

## Component Patterns

### Best Practice: Function Components

```typescript
// Good - Function component with TypeScript
interface UserCardProps {
  user: User
  onSelect?: (user: User) => void
}

function UserCard({ user, onSelect }: UserCardProps) {
  return (
    <div onClick={() => onSelect?.(user)}>
      {user.name}
    </div>
  )
}
```

**Source**: [React Components](https://react.dev/learn/your-first-component)

### Best Practice: Composition over Props

```typescript
// Good - Composition
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>{children}</CardContent>
</Card>

// Avoid - Prop drilling
<Card title="Title" headerClass="..." contentClass="..." />
```

**Source**: [Kent C. Dodds - Composition](https://kentcdodds.com/blog/prop-drilling)

## Hooks

### Best Practice: Custom Hooks

```typescript
// Good - Extract logic to custom hook
function useUser(id: string) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUser(id).then(setUser).finally(() => setLoading(false))
  }, [id])

  return { user, loading }
}

// Usage
const { user, loading } = useUser(userId)
```

### Best Practice: useCallback/useMemo

```typescript
// Good - Memoize expensive computations
const sortedItems = useMemo(
  () => items.sort((a, b) => a.name.localeCompare(b.name)),
  [items]
)

// Good - Stable callback reference
const handleClick = useCallback(() => {
  onSelect(item)
}, [item, onSelect])
```

**Source**: [React Hooks](https://react.dev/reference/react)

## State Management

### Best Practice: Lift State Up

```typescript
// Good - State in common ancestor
function App() {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <>
      <List items={items} onSelect={setSelected} />
      <Detail itemId={selected} />
    </>
  )
}
```

### Best Practice: Context for Global State

```typescript
// Good - Context for theme/auth
const ThemeContext = createContext<Theme>('light')

function App() {
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  )
}

// Usage
const theme = useContext(ThemeContext)
```

**Source**: [Dan Abramov - State](https://overreacted.io/)

## Error Boundaries

### Best Practice: Error Boundary

```typescript
// Good - Catch render errors
class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />
    }
    return this.props.children
  }
}
```

**Source**: [Kent C. Dodds - Error Boundaries](https://kentcdodds.com/blog/use-react-error-boundary)

## Data Fetching

### Best Practice: Suspense + use()

```typescript
// Good - React 19+ with use()
function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise)
  return <div>{user.name}</div>
}

// With Suspense
<Suspense fallback={<Loading />}>
  <UserProfile userPromise={fetchUser(id)} />
</Suspense>
```

### Best Practice: React Query / SWR

```typescript
// Good - Library for data fetching
const { data, isLoading, error } = useQuery({
  queryKey: ['user', id],
  queryFn: () => fetchUser(id)
})
```

## Forms

### Best Practice: Controlled Components

```typescript
// Good - Controlled input
const [value, setValue] = useState('')

<input
  value={value}
  onChange={e => setValue(e.target.value)}
/>
```

## Anti-Patterns

| Avoid | Use Instead | Reason |
|-------|-------------|--------|
| Class components | Function components | Simpler, hooks |
| Prop drilling >3 levels | Context or composition | Maintainability |
| useEffect for data | React Query / SWR | Caching, dedup |
| Index as key | Unique ID | Reconciliation |
| Inline object props | useMemo or extract | Re-renders |

## Performance Tips

| Tip | Example |
|-----|---------|
| Lazy load routes | `React.lazy(() => import('./Route'))` |
| Virtualize long lists | `react-window` / `@tanstack/virtual` |
| Memoize expensive renders | `React.memo(Component)` |
| Avoid inline functions | `useCallback` |

## Sources

- [React Docs](https://react.dev)
- [Kent C. Dodds Blog](https://kentcdodds.com/blog)
- [Dan Abramov - Overreacted](https://overreacted.io)
- [Josh Comeau](https://www.joshwcomeau.com)
