---
name: playwright-browser
version: 1.0.0
keywords: [playwright, browser, screenshot, pdf, e2e, ui, visual, qa, user story, automation]
for_agents: [browser-qa, builder]
description: Playwright browser automation for UI testing - CLI commands, programmatic API, and user story YAML schema.
---

# Playwright Browser Skill

## When to Use

Activate when the prompt contains: playwright, browser, screenshot, ui test, visual, qa, user story, e2e, automation.

## Setup

```bash
npx playwright install chromium
```

Playwright is used via `npx` (NOT added to package.json). It is an on-demand tool.

## CLI Commands

| Command | Description |
|---------|-------------|
| `npx playwright screenshot <url> <output.png>` | Capture full page screenshot |
| `npx playwright screenshot --full-page <url> <output.png>` | Capture with scroll |
| `npx playwright pdf <url> <output.pdf>` | Generate PDF from page |
| `npx playwright open <url>` | Open browser interactively |
| `npx playwright --version` | Check installation |

### CLI Examples

```bash
npx playwright screenshot http://localhost:5173 ./evidence/home.png
npx playwright screenshot --full-page http://localhost:5173 ./evidence/home-full.png
npx playwright pdf http://localhost:5173 ./evidence/home.pdf
```

## Programmatic API with Bun

For complex interactions (clicks, fills, waits, assertions), use a temporary Bun script.

```typescript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
});
const page = await context.newPage();

await page.goto('http://localhost:5173');
await page.waitForSelector('textarea');
await page.fill('textarea', 'Hello, test message');
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);
await page.screenshot({ path: './evidence/result.png', fullPage: true });

await browser.close();
```

### Action Reference

| Action | Playwright Method | Example |
|--------|-------------------|---------|
| navigate | `page.goto(url)` | `await page.goto('http://localhost:5173')` |
| click | `page.click(selector)` | `await page.click('button[type="submit"]')` |
| type | `page.type(selector, text)` | `await page.type('input', 'hello')` |
| fill | `page.fill(selector, text)` | `await page.fill('textarea', 'message')` |
| wait | `page.waitForTimeout(ms)` | `await page.waitForTimeout(3000)` |
| screenshot | `page.screenshot(opts)` | `await page.screenshot({ path: 'out.png' })` |
| scroll | `page.evaluate` | `await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))` |
| hover | `page.hover(selector)` | `await page.hover('.menu-item')` |

### Assertion Reference

| Type | Playwright Expect | Example |
|------|-------------------|---------|
| visible | `toBeVisible()` | `await expect(page.locator('textarea')).toBeVisible()` |
| hidden | `toBeHidden()` | `await expect(page.locator('.spinner')).toBeHidden()` |
| text | `toHaveText(text)` | `await expect(page.locator('h1')).toHaveText('Welcome')` |
| value | `toHaveValue(val)` | `await expect(page.locator('input')).toHaveValue('hello')` |
| title | `toHaveTitle(title)` | `await expect(page).toHaveTitle('Claude Code')` |
| url | `toHaveURL(url)` | `await expect(page).toHaveURL(/\/session\//)` |
| count | `toHaveCount(n)` | `await expect(page.locator('.message')).toHaveCount(3)` |

## User Story YAML Schema

Stories are declarative YAML files stored in `.claude/ui-stories/`.

```yaml
name: string              # Unique identifier for the story
description: string       # What this story verifies
url: string               # Base URL (e.g., http://localhost:5173)
viewport:
  width: number           # Viewport width in pixels
  height: number          # Viewport height in pixels
prerequisites:            # Conditions that must be true before running
  - string
steps:                    # Ordered list of actions to execute
  - action: string        # One of: navigate, click, type, fill, wait, screenshot, scroll, hover
    target: string        # Selector, URL, milliseconds, or output path depending on action
    value: string         # (optional) Text to type/fill
    assert:               # (optional) Assertion to run after the action
      type: string        # One of: visible, hidden, text, value, title, url, count
      target: string      # Selector or expected value
      value: string       # (optional) Expected value for text/value/count assertions
    screenshot: boolean   # (optional) Capture screenshot after this step
```

### Step Actions

| Action | target | value | Description |
|--------|--------|-------|-------------|
| `navigate` | URL | - | Go to URL |
| `click` | CSS selector | - | Click element |
| `type` | CSS selector | text | Type text character by character |
| `fill` | CSS selector | text | Fill input instantly |
| `wait` | milliseconds | - | Wait for duration |
| `screenshot` | output file path | - | Capture screenshot |
| `scroll` | `top`, `bottom`, or pixels | - | Scroll page |
| `hover` | CSS selector | - | Hover over element |

### Assertion Types

| Type | target | value | Checks |
|------|--------|-------|--------|
| `visible` | CSS selector | - | Element is visible |
| `hidden` | CSS selector | - | Element is hidden |
| `text` | CSS selector | expected text | Element contains text |
| `value` | CSS selector | expected value | Input has value |
| `title` | expected title | - | Page title matches |
| `url` | URL or regex | - | Current URL matches |
| `count` | CSS selector | expected count | Number of matching elements |

## Evidence Directory

All screenshots and reports are stored in `.claude/ui-evidence/{story-name}/`.

```
.claude/ui-evidence/
  chat-flow/
    01-loaded.png
    02-typed.png
    04-response.png
  session-management/
    01-home.png
    02-new-session.png
  report.md
```

---

**Version**: 1.0.0
**Stack**: Playwright, Bun, YAML
