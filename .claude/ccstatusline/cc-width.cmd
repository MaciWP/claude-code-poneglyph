@echo off
rem Windows wrapper: Claude Code pipes stdout (no TTY) so ccstatusline cannot detect width.
rem CC sets COLUMNS to the live terminal width each refresh (v2.1.153+); map it to
rem CCSTATUSLINE_WIDTH so flex-separators expand and adapt on resize (macOS-like).
rem Referenced only from settings.machine.json (Windows); macOS keeps bare ccstatusline.
setlocal
if defined COLUMNS set "CCSTATUSLINE_WIDTH=%COLUMNS%"
ccstatusline
