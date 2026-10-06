"""
Desktop automation. Parses a natural-language command into a known action
and executes it (or, for destructive actions, waits for explicit
confirmation before executing).

Deliberately uses a deterministic keyword/pattern matcher rather than
routing every command through the LLM: it's instant, has no failure mode
where the model "interprets" a shutdown command incorrectly, and every
supported command is enumerated and testable.
"""
from __future__ import annotations

import os
import platform
import re
import subprocess
import webbrowser
from dataclasses import dataclass
from typing import Callable, Optional

IS_WINDOWS = platform.system() == "Windows"

# Commands that must be confirmed before executing.
DESTRUCTIVE_ACTIONS = {"shutdown", "restart", "lock", "sleep"}


@dataclass
class ParsedCommand:
    action: str
    label: str
    destructive: bool
    args: dict


class AutomationError(RuntimeError):
    pass


def _open_windows_app(exe_names: list[str]) -> None:
    """Try a list of common executable/command names until one launches."""
    last_error: Optional[Exception] = None
    for name in exe_names:
        try:
            subprocess.Popen(name, shell=True)
            return
        except Exception as exc:  # noqa: BLE001
            last_error = exc
    raise AutomationError(f"Could not launch any of {exe_names}: {last_error}")


APP_LAUNCHERS: dict[str, Callable[[], None]] = {
    "chrome": lambda: _open_windows_app(["start chrome" if IS_WINDOWS else "google-chrome"]),
    "vscode": lambda: _open_windows_app(["code"]),
    "spotify": lambda: _open_windows_app(["start spotify" if IS_WINDOWS else "spotify"]),
    "discord": lambda: _open_windows_app(["start discord" if IS_WINDOWS else "discord"]),
    "steam": lambda: _open_windows_app(["start steam" if IS_WINDOWS else "steam"]),
    "calculator": lambda: _open_windows_app(["calc" if IS_WINDOWS else "gnome-calculator"]),
    "notepad": lambda: _open_windows_app(["notepad" if IS_WINDOWS else "gedit"]),
    "whatsapp": lambda: webbrowser.open("https://web.whatsapp.com"),
    "chatgpt": lambda: webbrowser.open("https://chat.openai.com"),
}


def _open_downloads() -> None:
    downloads = os.path.join(os.path.expanduser("~"), "Downloads")
    if IS_WINDOWS:
        subprocess.Popen(f'explorer "{downloads}"')
    else:
        subprocess.Popen(["xdg-open", downloads])


def _power_action(action: str) -> None:
    if not IS_WINDOWS:
        raise AutomationError(
            f"'{action}' is only implemented for Windows in this build (running on "
            f"{platform.system()})."
        )
    commands = {
        "shutdown": "shutdown /s /t 5",
        "restart": "shutdown /r /t 5",
        "sleep": "rundll32.exe powrprof.dll,SetSuspendState 0,1,0",
        "lock": "rundll32.exe user32.dll,LockWorkStation",
    }
    subprocess.Popen(commands[action], shell=True)


# Ordered so more specific patterns are checked before generic ones.
PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\bsearch (?:google )?for (.+)", re.I), "search_google"),
    (re.compile(r"\bgoogle (.+)", re.I), "search_google"),
    (re.compile(r"\bsearch youtube for (.+)", re.I), "search_youtube"),
    (re.compile(r"\byoutube (.+)", re.I), "search_youtube"),
    (re.compile(r"\bopen downloads?\b", re.I), "open_downloads"),
    (re.compile(r"\bshut ?down\b", re.I), "shutdown"),
    (re.compile(r"\brestart\b", re.I), "restart"),
    (re.compile(r"\block(?: (?:the )?(?:computer|pc|screen))?\b", re.I), "lock"),
    (re.compile(r"\bsleep\b", re.I), "sleep"),
] + [(re.compile(rf"\bopen {name}\b", re.I), f"open:{name}") for name in APP_LAUNCHERS]


def parse_command(text: str) -> Optional[ParsedCommand]:
    """Returns None if the text doesn't match any known automation command
    (the caller should then treat it as a normal chat message)."""
    for pattern, action in PATTERNS:
        match = pattern.search(text)
        if not match:
            continue

        if action.startswith("open:"):
            app = action.split(":", 1)[1]
            return ParsedCommand(action=action, label=f"Open {app.title()}", destructive=False, args={})
        if action == "open_downloads":
            return ParsedCommand(action=action, label="Open Downloads folder", destructive=False, args={})
        if action in ("search_google", "search_youtube"):
            query = match.group(1).strip()
            engine = "Google" if action == "search_google" else "YouTube"
            return ParsedCommand(
                action=action, label=f'Search {engine} for "{query}"', destructive=False,
                args={"query": query},
            )
        if action in DESTRUCTIVE_ACTIONS:
            return ParsedCommand(
                action=action, label=action.title(), destructive=True, args={}
            )
    return None


def execute(command: ParsedCommand) -> str:
    """Executes a previously-parsed command. Returns a human-readable result."""
    if command.action.startswith("open:"):
        app = command.action.split(":", 1)[1]
        APP_LAUNCHERS[app]()
        return f"Opened {app.title()}."
    if command.action == "open_downloads":
        _open_downloads()
        return "Opened your Downloads folder."
    if command.action == "search_google":
        webbrowser.open(f"https://www.google.com/search?q={command.args['query']}")
        return f"Searching Google for \"{command.args['query']}\"."
    if command.action == "search_youtube":
        webbrowser.open(f"https://www.youtube.com/results?search_query={command.args['query']}")
        return f"Searching YouTube for \"{command.args['query']}\"."
    if command.action in DESTRUCTIVE_ACTIONS:
        _power_action(command.action)
        return f"{command.action.title()} initiated."
    raise AutomationError(f"Unknown action '{command.action}'")
