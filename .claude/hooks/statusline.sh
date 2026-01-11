#!/bin/bash
# Status line for Claude Code - Binora Backend
#
# KNOWN LIMITATION: Context estimation uses accumulated cost, which doesn't
# reset after /compact. The modulo 100 approximation (line 30-32) is imprecise.
# Claude Code doesn't expose real context usage in the JSON input.
# Monitor for auto-compaction as the true indicator of context exhaustion.

input=$(cat)

# Core metrics from Claude Code
MODEL=$(echo "$input" | jq -r '.model.display_name // "?"')
COST=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
LINES_ADDED=$(echo "$input" | jq -r '.cost.total_lines_added // 0')
LINES_REMOVED=$(echo "$input" | jq -r '.cost.total_lines_removed // 0')

# Token estimation from cost (approximation)
# Opus: ~$15/1M input + $75/1M output, avg ~$45/1M tokens
# Sonnet: ~$3/1M input + $15/1M output, avg ~$9/1M tokens
# Context limit: Opus/Sonnet = 200K tokens
CONTEXT_LIMIT=200000

if [ "$COST" != "0" ] && [ "$COST" != "null" ]; then
    # Estimate tokens from cost (using Opus avg rate as baseline)
    # $1 ≈ 22K tokens average (mix input/output)
    COST_FLOAT=$(echo "$COST" | sed 's/[^0-9.]//g')
    if [ -n "$COST_FLOAT" ]; then
        ESTIMATED_TOKENS=$(echo "$COST_FLOAT * 22000" | bc 2>/dev/null | cut -d. -f1)
        if [ -n "$ESTIMATED_TOKENS" ] && [ "$ESTIMATED_TOKENS" -gt 0 ] 2>/dev/null; then
            CONTEXT_PCT=$((ESTIMATED_TOKENS * 100 / CONTEXT_LIMIT))
            TOKENS_K=$((ESTIMATED_TOKENS / 1000))
            # After /compact, cost keeps growing but context resets
            # Use modulo 100 to estimate current context after compacts
            # 143% -> 43%, 250% -> 50%, etc.
            if [ "$CONTEXT_PCT" -gt 100 ]; then
                CONTEXT_PCT=$((CONTEXT_PCT % 100))
            fi
        else
            CONTEXT_PCT=0
            TOKENS_K=0
        fi
    else
        CONTEXT_PCT=0
        TOKENS_K=0
    fi
else
    CONTEXT_PCT=0
    TOKENS_K=0
fi

# Git branch
BRANCH=""
if git rev-parse --git-dir > /dev/null 2>&1; then
    BRANCH=$(git branch --show-current 2>/dev/null)
fi

# Format cost
COST_FMT=$(printf "%.2f" "$COST")

# Context color with progressive warnings
if [ "$CONTEXT_PCT" -gt 90 ]; then
    CTX_COLOR="\033[41;37;1m"  # WHITE on RED background, bold - CRITICAL
    CTX_WARN="🚨 "
    CTX_MSG="¡COMPACTAR YA!"
elif [ "$CONTEXT_PCT" -gt 80 ]; then
    CTX_COLOR="\033[31;1m"  # Red bold
    CTX_WARN="⚠️ "
    CTX_MSG="/compact"
elif [ "$CONTEXT_PCT" -gt 65 ]; then
    CTX_COLOR="\033[33;1m"  # Yellow bold
    CTX_WARN="⏰ "
    CTX_MSG=""
elif [ "$CONTEXT_PCT" -gt 50 ]; then
    CTX_COLOR="\033[33m"  # Yellow
    CTX_WARN=""
    CTX_MSG=""
else
    CTX_COLOR="\033[32m"  # Green
    CTX_WARN=""
    CTX_MSG=""
fi

# === OUTPUT ===
# Format: [Model] $Cost Duration Branch | Context% | +Lines/-Lines

# Model (cyan)
printf "\033[36m[%s]\033[0m" "$MODEL"

# Cost (yellow)
printf " \033[33m\$%s\033[0m" "$COST_FMT"

# Git branch (green)
if [ -n "$BRANCH" ]; then
    printf " \033[32m%s\033[0m" "$BRANCH"
fi

# Separator
printf " |"

# Context percentage (always show, estimated from cost)
printf " ${CTX_WARN}${CTX_COLOR}~%d%%\033[0m" "$CONTEXT_PCT"

# Show warning message if set
if [ -n "$CTX_MSG" ]; then
    printf " \033[31;1m%s\033[0m" "$CTX_MSG"
fi

printf " |"

# Lines changed
printf " +%s/-%s" "$LINES_ADDED" "$LINES_REMOVED"

# Token count (estimated)
if [ "$TOKENS_K" -gt 0 ] 2>/dev/null; then
    printf " \033[2m(~%dk)\033[0m" "$TOKENS_K"
fi
