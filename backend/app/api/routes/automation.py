from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import automation_service as automation
from app.services.automation_service import AutomationError, ParsedCommand

logger = logging.getLogger("JARVIS.automation")
router = APIRouter(prefix="/automation", tags=["automation"])


class CommandRequest(BaseModel):
    text: str


class ConfirmRequest(BaseModel):
    action: str


class CommandResult(BaseModel):
    matched: bool
    requires_confirmation: bool = False
    label: str | None = None
    action: str | None = None
    result: str | None = None
    message: str | None = None


def _rehydrate(action: str) -> ParsedCommand:
    """Re-parses a bare action string back into a ParsedCommand for
    execution after confirmation (keeps the API stateless -- no server-side
    session needed to remember what was pending)."""
    if action.startswith("open:"):
        app = action.split(":", 1)[1]
        return ParsedCommand(action=action, label=f"Open {app.title()}", destructive=False, args={})
    if action in automation.DESTRUCTIVE_ACTIONS:
        return ParsedCommand(action=action, label=action.title(), destructive=True, args={})
    raise HTTPException(status_code=400, detail=f"Unknown or non-confirmable action '{action}'")


@router.post("/command", response_model=CommandResult)
def run_command(body: CommandRequest):
    parsed = automation.parse_command(body.text)
    if not parsed:
        return CommandResult(matched=False, message="No automation command matched this text.")

    if parsed.destructive:
        return CommandResult(
            matched=True,
            requires_confirmation=True,
            label=parsed.label,
            action=parsed.action,
        )

    try:
        result = automation.execute(parsed)
    except AutomationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return CommandResult(matched=True, requires_confirmation=False, label=parsed.label, result=result)


@router.post("/confirm", response_model=CommandResult)
def confirm_command(body: ConfirmRequest):
    parsed = _rehydrate(body.action)
    try:
        result = automation.execute(parsed)
    except AutomationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    logger.info("Executed confirmed destructive action: %s", parsed.action)
    return CommandResult(matched=True, requires_confirmation=False, label=parsed.label, result=result)


@router.get("/available-apps")
def available_apps():
    return {"apps": sorted(automation.APP_LAUNCHERS.keys())}
