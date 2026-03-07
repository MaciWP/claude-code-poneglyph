# SOLID Principles

## S - Single Responsibility

```typescript
// BAD: Class handles multiple concerns
class UserManager {
  async createUser(data: UserData) { /* ... */ }
  async sendWelcomeEmail(user: User) { /* ... */ }  // Email concern
  async generateReport(userId: string) { /* ... */ } // Reporting concern
  async validatePassword(password: string) { /* ... */ } // Validation concern
}

// GOOD: Each class has one reason to change
class UserService {
  constructor(
    private readonly emailService: EmailService,
    private readonly validator: PasswordValidator,
  ) {}

  async createUser(data: UserData): Promise<User> {
    this.validator.validate(data.password)
    const user = await this.saveUser(data)
    await this.emailService.sendWelcome(user)
    return user
  }

  private async saveUser(data: UserData): Promise<User> {
    return db.users.create(data)
  }
}

class EmailService {
  async sendWelcome(user: User): Promise<void> { /* ... */ }
  async sendPasswordReset(user: User, token: string): Promise<void> { /* ... */ }
}

class PasswordValidator {
  validate(password: string): void { /* ... */ }
}

class UserReportService {
  async generateReport(userId: string): Promise<Report> { /* ... */ }
}
```

## O - Open/Closed Principle

```typescript
// BAD: Must modify class for each new payment type
class PaymentProcessor {
  async process(type: string, amount: number): Promise<void> {
    if (type === 'card') {
      await this.processCard(amount)
    } else if (type === 'paypal') {
      await this.processPayPal(amount)
    } else if (type === 'crypto') {
      await this.processCrypto(amount)
    }
    // Must add new else-if for each payment type
  }
}

// GOOD: Open for extension, closed for modification
interface PaymentMethod {
  readonly type: string
  process(amount: number): Promise<PaymentResult>
}

class CardPayment implements PaymentMethod {
  readonly type = 'card'
  async process(amount: number): Promise<PaymentResult> {
    // Card-specific logic
    return { success: true, transactionId: '...' }
  }
}

class PayPalPayment implements PaymentMethod {
  readonly type = 'paypal'
  async process(amount: number): Promise<PaymentResult> {
    // PayPal-specific logic
    return { success: true, transactionId: '...' }
  }
}

// New payment types just implement the interface
class CryptoPayment implements PaymentMethod {
  readonly type = 'crypto'
  async process(amount: number): Promise<PaymentResult> {
    return { success: true, transactionId: '...' }
  }
}

class PaymentProcessor {
  private methods = new Map<string, PaymentMethod>()

  register(method: PaymentMethod): void {
    this.methods.set(method.type, method)
  }

  async process(type: string, amount: number): Promise<PaymentResult> {
    const method = this.methods.get(type)
    if (!method) throw new Error(`Unknown payment type: ${type}`)
    return method.process(amount)
  }
}
```

## L - Liskov Substitution Principle

```typescript
// BAD: Subclass violates base class contract
class Rectangle {
  constructor(protected width: number, protected height: number) {}

  setWidth(w: number): void { this.width = w }
  setHeight(h: number): void { this.height = h }
  getArea(): number { return this.width * this.height }
}

class Square extends Rectangle {
  setWidth(w: number): void {
    this.width = w
    this.height = w // Violates LSP: changes behavior
  }
  setHeight(h: number): void {
    this.width = h
    this.height = h // Violates LSP: changes behavior
  }
}

// GOOD: Use composition or separate interfaces
interface Shape {
  getArea(): number
}

class Rectangle implements Shape {
  constructor(
    private readonly width: number,
    private readonly height: number
  ) {}

  getArea(): number {
    return this.width * this.height
  }
}

class Square implements Shape {
  constructor(private readonly side: number) {}

  getArea(): number {
    return this.side * this.side
  }
}

// Both can be used wherever Shape is expected
function printArea(shape: Shape): void {
  console.log(`Area: ${shape.getArea()}`)
}
```

## I - Interface Segregation

```typescript
// BAD: Fat interface forces unnecessary implementations
interface Worker {
  work(): void
  eat(): void
  sleep(): void
  attendMeeting(): void
}

class Robot implements Worker {
  work(): void { /* OK */ }
  eat(): void { throw new Error('Robots do not eat') } // Forced to implement
  sleep(): void { throw new Error('Robots do not sleep') } // Forced to implement
  attendMeeting(): void { /* OK */ }
}

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

interface Meetable {
  attendMeeting(): void
}

class Human implements Workable, Feedable, Restable, Meetable {
  work(): void { /* ... */ }
  eat(): void { /* ... */ }
  sleep(): void { /* ... */ }
  attendMeeting(): void { /* ... */ }
}

class Robot implements Workable, Meetable {
  work(): void { /* ... */ }
  attendMeeting(): void { /* ... */ }
  // No need to implement eat/sleep
}
```

## D - Dependency Inversion

```typescript
// BAD: High-level module depends on low-level module
class UserService {
  private db = new PostgresDatabase() // Direct dependency
  private mailer = new SendGridMailer() // Direct dependency

  async createUser(data: UserData): Promise<User> {
    const user = await this.db.insert('users', data)
    await this.mailer.send(user.email, 'Welcome!')
    return user
  }
}

// GOOD: Depend on abstractions
interface Database {
  insert<T>(table: string, data: T): Promise<T>
  find<T>(table: string, id: string): Promise<T | null>
}

interface Mailer {
  send(to: string, subject: string, body: string): Promise<void>
}

class UserService {
  constructor(
    private readonly db: Database,
    private readonly mailer: Mailer,
  ) {}

  async createUser(data: UserData): Promise<User> {
    const user = await this.db.insert('users', data)
    await this.mailer.send(user.email, 'Welcome!', 'Thanks for joining')
    return user
  }
}

// Easily swap implementations
const userService = new UserService(
  new PostgresDatabase(), // or new MongoDatabase()
  new SendGridMailer(),   // or new MailgunMailer()
)

// Easy to test with mocks
const testService = new UserService(
  createMockDatabase(),
  createMockMailer(),
)
```
