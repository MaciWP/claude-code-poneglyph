# SOLID Violations

5 SOLID principle violations with detection and fixes.

## 1. Single Responsibility Violation

**Problem**: Class has multiple reasons to change.

**BEFORE**:
```typescript
// BAD: Multiple responsibilities
class UserService {
  async createUser(data: UserData): Promise<User> { /* ... */ }
  validateEmail(email: string): boolean { /* ... */ }  // Should be ValidationService
  sendWelcomeEmail(user: User): Promise<void> { /* ... */ }  // Should be EmailService
  generateUserReport(): Report { /* ... */ }  // Should be ReportService
  formatUserForAPI(user: User): APIUser { /* ... */ }  // Should be UserSerializer
}
```

**AFTER**:
```typescript
// GOOD: Single responsibility
class UserService {
  constructor(
    private validator: UserValidator,
    private emailService: EmailService,
    private repository: UserRepository
  ) {}

  async createUser(data: UserData): Promise<User> {
    this.validator.validateUserData(data)
    const user = await this.repository.create(data)
    await this.emailService.sendWelcome(user)
    return user
  }
}
```

## 2. Open/Closed Violation

**Problem**: Must modify existing code to add new behavior.

**BEFORE**:
```typescript
// BAD: Must modify for every new payment type
function processPayment(type: string, amount: number) {
  switch (type) {
    case 'credit':
      return processCreditCard(amount)
    case 'paypal':
      return processPayPal(amount)
    case 'crypto':
      return processCrypto(amount)
    // Must add case for every new type
  }
}
```

**AFTER**:
```typescript
// GOOD: Open for extension, closed for modification
interface PaymentProcessor {
  process(amount: number): Promise<PaymentResult>
}

class CreditCardProcessor implements PaymentProcessor {
  async process(amount: number): Promise<PaymentResult> { /* ... */ }
}

class PayPalProcessor implements PaymentProcessor {
  async process(amount: number): Promise<PaymentResult> { /* ... */ }
}

// Registry pattern - add new processors without modifying existing code
const processors = new Map<string, PaymentProcessor>([
  ['credit', new CreditCardProcessor()],
  ['paypal', new PayPalProcessor()],
])

function processPayment(type: string, amount: number): Promise<PaymentResult> {
  const processor = processors.get(type)
  if (!processor) throw new Error(`Unknown payment type: ${type}`)
  return processor.process(amount)
}

// Adding new type doesn't require modifying processPayment
processors.set('crypto', new CryptoProcessor())
```

## 3. Liskov Substitution Violation

**Problem**: Subclass changes base class behavior in unexpected ways.

**Detection**: Overridden methods that throw or change semantics.

**BEFORE**:
```typescript
// BAD: Square violates Rectangle contract
class Rectangle {
  constructor(protected width: number, protected height: number) {}

  setWidth(w: number): void { this.width = w }
  setHeight(h: number): void { this.height = h }
  area(): number { return this.width * this.height }
}

class Square extends Rectangle {
  setWidth(w: number): void {
    this.width = w
    this.height = w  // Unexpected side effect!
  }
  setHeight(h: number): void {
    this.width = h
    this.height = h  // Unexpected side effect!
  }
}
```

**AFTER**:
```typescript
// GOOD: Separate interfaces for different shapes
interface Shape {
  area(): number
}

class Rectangle implements Shape {
  constructor(private width: number, private height: number) {}
  area(): number { return this.width * this.height }
}

class Square implements Shape {
  constructor(private side: number) {}
  area(): number { return this.side * this.side }
}
```

## 4. Interface Segregation Violation

**Problem**: Clients forced to implement methods they don't need.

**Detection**: Interfaces with methods throwing `NotImplemented`.

**BEFORE**:
```typescript
// BAD: Fat interface
interface Worker {
  work(): void
  eat(): void
  sleep(): void
  attendMeeting(): void
}

class Robot implements Worker {
  work(): void { /* ... */ }
  eat(): void { throw new Error('Robots do not eat') }  // Violation!
  sleep(): void { throw new Error('Robots do not sleep') }  // Violation!
  attendMeeting(): void { throw new Error('Not applicable') }  // Violation!
}
```

**AFTER**:
```typescript
// GOOD: Segregated interfaces
interface Workable {
  work(): void
}

interface Feedable {
  eat(): void
}

interface Restable {
  sleep(): void
}

class Robot implements Workable {
  work(): void { /* ... */ }
}

class Human implements Workable, Feedable, Restable {
  work(): void { /* ... */ }
  eat(): void { /* ... */ }
  sleep(): void { /* ... */ }
}
```

## 5. Dependency Inversion Violation

**Problem**: High-level module depends on low-level implementation.

**BEFORE**:
```typescript
// BAD: Direct dependency on concrete implementation
class UserService {
  private db = new PostgresDatabase()  // Tight coupling
  private cache = new RedisCache()     // Can't swap implementations

  async getUser(id: string): Promise<User> {
    const cached = await this.cache.get(`user:${id}`)
    if (cached) return cached
    return this.db.query('SELECT * FROM users WHERE id = $1', [id])
  }
}
```

**AFTER**:
```typescript
// GOOD: Depend on abstractions
interface Database {
  query<T>(sql: string, params: unknown[]): Promise<T>
}

interface Cache {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
}

class UserService {
  constructor(
    private db: Database,
    private cache: Cache
  ) {}

  async getUser(id: string): Promise<User> {
    const cached = await this.cache.get<User>(`user:${id}`)
    if (cached) return cached

    const user = await this.db.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    )
    await this.cache.set(`user:${id}`, user, 3600)
    return user
  }
}

// Easy to swap implementations for testing
const userService = new UserService(
  new PostgresDatabase(),  // or MockDatabase for tests
  new RedisCache()         // or InMemoryCache for tests
)
```
