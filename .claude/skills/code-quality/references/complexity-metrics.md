# Complexity Metrics

Cyclomatic and cognitive complexity measurement with examples.

## Cyclomatic Complexity

Count decision points: `if`, `else if`, `while`, `for`, `case`, `&&`, `||`, `?:`

| Complexity | Rating | Action |
|------------|--------|--------|
| 1-5 | Simple | OK |
| 6-10 | Moderate | Consider refactoring |
| 11-20 | Complex | Refactor required |
| > 20 | Very Complex | Split immediately |

### Example

**BEFORE** (Complexity: 12):
```typescript
function calculatePrice(product: Product, user: User): number {
  let price = product.basePrice

  if (user.isPremium) {                    // +1
    if (user.yearsActive > 5) {            // +1
      price *= 0.8
    } else if (user.yearsActive > 2) {     // +1
      price *= 0.9
    }
  }

  if (product.isOnSale) {                  // +1
    price *= 0.85
  } else if (product.isClearance) {        // +1
    price *= 0.7
  }

  if (user.hasVoucher && product.voucherEligible) {  // +2 (&&)
    price -= 10
  }

  return price > 0 ? price : 0             // +1
}
```

**AFTER** (Complexity: 3 per function):
```typescript
function calculatePrice(product: Product, user: User): number {
  const basePrice = product.basePrice
  const userDiscount = getUserDiscount(user)
  const productDiscount = getProductDiscount(product)
  const voucherDiscount = getVoucherDiscount(user, product)

  const finalPrice = basePrice * userDiscount * productDiscount - voucherDiscount
  return Math.max(0, finalPrice)
}

function getUserDiscount(user: User): number {
  if (!user.isPremium) return 1
  if (user.yearsActive > 5) return 0.8
  if (user.yearsActive > 2) return 0.9
  return 1
}

function getProductDiscount(product: Product): number {
  if (product.isOnSale) return 0.85
  if (product.isClearance) return 0.7
  return 1
}

function getVoucherDiscount(user: User, product: Product): number {
  return user.hasVoucher && product.voucherEligible ? 10 : 0
}
```

## Cognitive Complexity

Measures how hard code is to understand. Nesting increases the penalty.

### Scoring Rules

| Construct | Base Penalty | Nesting Penalty |
|-----------|-------------|-----------------|
| `if`, `else if`, `else` | +1 | +1 per nesting level |
| `for`, `while`, `do` | +1 | +1 per nesting level |
| `catch` | +1 | +1 per nesting level |
| `switch` | +1 | +1 per nesting level |
| `&&`, `||` (sequence) | +1 | none |
| `break`, `continue` to label | +1 | none |
| Recursion | +1 | none |

### Example

**BEFORE** (High cognitive load):
```typescript
function validate(data: FormData): ValidationResult {
  const errors: string[] = []

  if (data.type === 'user') {
    if (data.email) {
      if (!isValidEmail(data.email)) {
        errors.push('Invalid email')
      }
    } else {
      errors.push('Email required')
    }
    if (data.age) {
      if (data.age < 0 || data.age > 150) {
        errors.push('Invalid age')
      }
    }
  } else if (data.type === 'company') {
    if (data.taxId) {
      if (!isValidTaxId(data.taxId)) {
        errors.push('Invalid tax ID')
      }
    } else {
      errors.push('Tax ID required')
    }
  }

  return { valid: errors.length === 0, errors }
}
```

**AFTER** (Low cognitive load):
```typescript
function validate(data: FormData): ValidationResult {
  const validator = validators[data.type]
  if (!validator) {
    return { valid: false, errors: ['Unknown type'] }
  }
  return validator(data)
}

const validators: Record<string, (data: FormData) => ValidationResult> = {
  user: validateUser,
  company: validateCompany,
}

function validateUser(data: FormData): ValidationResult {
  const errors: string[] = []

  if (!data.email) errors.push('Email required')
  else if (!isValidEmail(data.email)) errors.push('Invalid email')

  if (data.age && (data.age < 0 || data.age > 150)) {
    errors.push('Invalid age')
  }

  return { valid: errors.length === 0, errors }
}
```
