---
parent: meta-create-skill
name: frontmatter-spec
description: Canonical v2 skill frontmatter reference — all fields, valid values, invalid fields, invocation model
---

# Skill Frontmatter — Canonical v2 Reference

Full spec for every field allowed in skill frontmatter. Read this when authoring a skill's frontmatter and you need to know exactly what fields are allowed, what values they accept, and which fields are forbidden.

## Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Unique kebab-case identifier |
| `description` | string | Yes | Purpose + "Use when:" + "Keywords -" lines |
| `type` | string | Yes | `knowledge-base` \| `encoded-preference` \| `workflow` \| `reference` \| `capability-uplift` |
| `disable-model-invocation` | boolean | No | `true` = manual only (workflow), `false` = auto-trigger by keywords |
| `argument-hint` | string | No | Args shown in autocomplete (e.g., `"[file-path or module]"`) |
| `effort` | string | No | `low` (quick reference) \| `medium` (moderate analysis) \| `high` (deep audit) |
| `activation.keywords` | list | No | YAML list of keywords for auto-matching |
| `for_agents` | list | No | Agents that benefit most from this skill |
| `version` | string | No | Semantic version (default "1.0") |

## Fields NOT valid in skill frontmatter

| Invalid Field | Reason | Alternative |
|---------------|--------|-------------|
| `allowed-tools` | Not a valid skill field | Use agent frontmatter `allowedTools` instead |
| `model` | Not a valid skill field | Model routing is handled by Lead dynamically |

## Invocation Model: Agents = Behavior, Skills = Knowledge

Skills provide domain knowledge that any agent can leverage. The `disable-model-invocation` field controls whether agents can self-invoke the skill:

| Skill Category | `disable-model-invocation` | Reason |
|----------------|---------------------------|--------|
| **Knowledge** (knowledge-base, reference, capability-uplift) | `false` | Any agent can invoke when needed — builder, reviewer, etc. |
| **Behavioral/Workflow** (workflow, mode toggles) | `true` | User-initiated — decisions, modes, scaffolding |
| **Meta** (encoded-preference for meta ops) | `true` | User-initiated — agent/skill creation |

A builder working on Django can self-invoke a `django-patterns` skill. A reviewer on the same project uses the same skill for review context. The skill is shared knowledge; the agent decides how to apply it.

## Description Format

The `description` field should follow this three-line pattern:

```yaml
description: |
  {One-line purpose statement}.
  Use when: {trigger conditions}.
  Keywords - {keyword1, keyword2, ...}
```

This format is load-bearing: the global skill index extracts the "Use when:" and "Keywords -" lines for auto-matching.

## Validation Rules for Skill Name

| Rule | Check | Error Message |
|------|-------|---------------|
| Name format | Must be kebab-case | "Skill name must be kebab-case (e.g., api-patterns)" |
| Name unique | No existing directory | "Skill {name} already exists at {path}" |
| Type valid | One of 5 types | "Type must be: knowledge-base, encoded-preference, workflow, reference, capability-uplift" |

## Full Example (all fields)

```yaml
---
name: django-patterns
description: |
  Django model and view conventions for this project.
  Use when: working with Django models, views, or serializers.
  Keywords - django, model, view, serializer, orm
type: knowledge-base
disable-model-invocation: false
argument-hint: "[file-path or module]"
effort: medium
activation:
  keywords:
    - django
    - model
    - view
    - serializer
for_agents: [builder, reviewer]
version: "1.0"
---
```
