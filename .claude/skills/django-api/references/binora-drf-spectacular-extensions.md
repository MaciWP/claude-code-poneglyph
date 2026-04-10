---
parent: django-api
name: binora-drf-spectacular-extensions
description: Binora-specific context for custom drf-spectacular field extensions that fix serialization issues
---

# Binora drf-spectacular Custom Field Extensions

## Purpose

drf-spectacular's auto-schema inference occasionally fails on custom DRF fields — producing incorrect or missing OpenAPI types. Binora maintains a set of custom field extensions to fix these cases without patching the library.

## Existing extensions

Before creating a new extension, check these — they likely cover your case:

| Extension | Fixes |
|-----------|-------|
| `DatacenterFieldFix` | Datacenter hyperlinked field schema |
| `_ProcessTypeFieldFix` | Process type enum schema |
| `_WorkflowFieldFix` | Workflow reference field schema |
| `_ProcessAssetInputFieldFix` | Process asset input serializer schema |

## Where to find them

| Path | Contents |
|------|----------|
| `hierarchy/utils/serializers.py` | `DatacenterFieldFix` and related hierarchy field fixes |
| `processes/utils/serializers/` | Process-related field fixes (`_ProcessTypeFieldFix`, `_WorkflowFieldFix`, `_ProcessAssetInputFieldFix`) |

## When to create a new one

1. Confirm auto-schema is wrong (run the contract test suite and inspect the generated schema)
2. Check the existing extensions above — reuse if possible
3. Only then write a new extension following the same pattern as `DatacenterFieldFix`

## Rule

Never patch drf-spectacular itself. Always fix via a custom field extension in the `*/utils/serializers*` modules.
