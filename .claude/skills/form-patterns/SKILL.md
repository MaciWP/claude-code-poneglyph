---
name: form-patterns
description: |
  Form implementation patterns for React/TypeScript frontends: React Hook Form v7 + Zod validation,
  form-field components, submission with React Query mutations, and error display.
  Use when creating forms, adding validation, or reviewing form implementations.
type: knowledge-base
disable-model-invocation: false
effort: medium
activation:
  keywords:
    - react hook form
    - zod
    - form validation
    - shadcn form
    - useform
    - zodresolver
    - formfield
    - form submission
    - schema validation
    - rhf
for_agents: [builder, reviewer]
context: fork
version: "1.0.0"
---

# Form Patterns

**THE #1 RULE: Forms use React Hook Form + Zod + shadcn/ui Form components. No manual state management for forms.**

---

## Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Form state | React Hook Form v7 | Field registration, validation, submission |
| Validation | Zod v3 | Schema definition, runtime validation |
| Resolver | `@hookform/resolvers/zod` | Bridges Zod to RHF |
| UI Components | shadcn/ui `Form*` | `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` |
| Submission | React Query mutation | `useMutation` for API calls |

---

## Standard Form Pattern

### Real Project Example (from `login-form.tsx`)

```typescript
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Input,
} from "@/components/ui/form";

// 1. Define Zod schema (co-located with form)
const formSchema = z.object({
  email: z.string().email().min(1),
  password: z.string().min(1),
});

// 2. Props interface
type LoginFormProps = {
  onSuccess: () => void;
};

// 3. Form component
export function LoginForm({ onSuccess }: LoginFormProps) {
  const { t } = useTranslation("login");

  // 4. Initialize form with Zod resolver
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // 5. Submit handler with mutation
  async function handleSubmit(values: z.infer<typeof formSchema>) {
    try {
      await login.mutateAsync(values);
      onSuccess();
    } catch (error) {
      form.setError("password", { type: "manual", message: t("loginError") });
    }
  }

  // 6. Render with Form components
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("email")}</FormLabel>
              <FormControl>
                <Input type="email" placeholder={t("email")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button disabled={form.formState.isSubmitting} type="submit">
          {t("submit")}
        </Button>
      </form>
    </Form>
  );
}
```

---

## Schema Definition Rules

| Rule | Example |
|------|---------|
| Co-locate schema with form component | Define in same file or adjacent `schema.ts` |
| Use `z.infer<typeof schema>` for types | `type FormData = z.infer<typeof formSchema>` |
| Export schema if needed by API layer | `export const createProcessInputSchema = ...` |
| Match API contract types | Fields should match OpenAPI generated types |

### Common Validations

```typescript
const schema = z.object({
  // Required string
  name: z.string().min(1, "Required"),

  // Email
  email: z.string().email("Invalid email"),

  // Optional field
  description: z.string().optional(),

  // Number with range
  quantity: z.number().min(1).max(100),

  // Select (enum-like)
  status: z.enum(["active", "inactive"]),

  // Date
  dueDate: z.string().datetime(),

  // Array of items
  items: z.array(z.object({
    name: z.string().min(1),
    value: z.number(),
  })).min(1, "At least one item required"),
});
```

---

## Form Field Pattern

Every field follows the same structure:

```typescript
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>{t("fieldLabel")}</FormLabel>
      <FormControl>
        <Input {...field} />  {/* or Select, Textarea, etc. */}
      </FormControl>
      <FormDescription>{t("fieldHelp")}</FormDescription>  {/* optional */}
      <FormMessage />  {/* shows validation error */}
    </FormItem>
  )}
/>
```

---

## Submission with Mutation

| Pattern | Detail |
|---------|--------|
| Use mutation hook | `useCreateThing()` or `useUpdateThing()` |
| Disable button while submitting | `disabled={form.formState.isSubmitting}` or `mutation.isPending` |
| Set server errors on fields | `form.setError("field", { message })` |
| Show notification on success/error | Via `notificationMessages` param on mutation hook |
| Reset form after success | `form.reset()` in `onSuccess` callback |

```typescript
const mutation = useCreateThing({
  notificationMessages: {
    success: { title: t("created"), message: t("thingCreated") },
    error: { title: t("error") },
  },
  mutationConfig: {
    onSuccess: () => {
      form.reset();
      onClose();
    },
  },
});

function handleSubmit(values: z.infer<typeof schema>) {
  mutation.mutate({ data: values });
}
```

---

## Error Display

| Error Type | How It Shows |
|-----------|-------------|
| Field validation (Zod) | `<FormMessage />` below field (automatic) |
| Server validation (API 400) | `form.setError("field", { message })` |
| General error | Notification via `addNotification({ type: "error" })` |
| Network error | Mutation `onError` handler |

---

## Form in Drawer/Dialog Pattern

```typescript
export function CreateThingDrawer({ isOpen, onClose }: DrawerProps) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
  });

  const mutation = useCreateThing({
    mutationConfig: {
      onSuccess: () => {
        form.reset();
        onClose();
      },
    },
  });

  return (
    <Drawer open={isOpen} onClose={onClose}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((values) => mutation.mutate({ data: values }))}>
          {/* Fields */}
          <Button disabled={mutation.isPending} type="submit">
            {mutation.isPending ? <Spinner size="sm" /> : t("create")}
          </Button>
        </form>
      </Form>
    </Drawer>
  );
}
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Correction |
|--------------|---------|------------|
| `useState` for each form field | No validation, no error state | Use React Hook Form |
| Missing `zodResolver` | No runtime validation | Always pass resolver |
| Missing `<FormMessage />` | User doesn't see errors | Add after every `<FormControl>` |
| Not disabling submit button | Double submissions | Disable with `isSubmitting` or `isPending` |
| Hardcoded error messages | Not translatable | Use `t("errorKey")` |
| Schema not matching API types | Runtime mismatches | Import types from `@/types`, match fields |
| Manual form reset | Incomplete cleanup | Use `form.reset()` |

---

**Version**: 1.0.0
**Project References**: `src/features/auth/components/login-form.tsx` (form example), `src/components/ui/form/` (UI components), `src/features/forms/api/process-input.ts` (shared schema)
