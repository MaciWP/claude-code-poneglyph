---
name: docs
description: Browse and load documentation under .claude/docs when a user asks for project docs or a specific topic.
---

# Docs Browser

1. List directories under `.claude/docs` as available topics.
2. If a topic is requested, read its `README.md` first.
3. List the remaining files in that topic and offer to load them.
4. If asked to load all, read every file in the topic folder.
