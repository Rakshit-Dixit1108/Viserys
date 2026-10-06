from __future__ import annotations

import json
import re

from fastapi import APIRouter, HTTPException

from app.db import database as db
from app.db.schemas import StudyPlanOut, StudyPlanRequest, StudyPlanWithTasks, TaskUpdate
from app.services.llm_service import LLMError, complete

router = APIRouter(prefix="/study-planner", tags=["study-planner"])


def _extract_json_array(text: str) -> list[dict]:
    """The model is asked for raw JSON but may wrap it in prose or a code
    fence; pull out the first [...] block and parse it."""
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if not match:
        raise HTTPException(status_code=502, detail="Could not parse a schedule from the model's response")
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"Model returned invalid JSON: {exc}") from exc
    if not isinstance(data, list):
        raise HTTPException(status_code=502, detail="Expected a JSON array of tasks")
    return data


@router.post("", response_model=StudyPlanWithTasks)
async def generate_plan(body: StudyPlanRequest):
    subjects_line = ", ".join(body.subjects)
    messages = [
        {
            "role": "system",
            "content": (
                "You generate study schedules. Respond with ONLY a JSON array, no prose, "
                "no markdown fences. Each element: "
                '{"day_number": <int, 1-indexed>, "subject": <string>, "task": <string>}. '
                "Distribute subjects sensibly across the days, mixing review and new "
                "material, roughly matching the given hours/day."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Goal: {body.goal}\nSubjects: {subjects_line}\n"
                f"Duration: {body.days} days at {body.hours_per_day} hours/day."
            ),
        },
    ]
    try:
        raw = await complete(messages)
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    tasks = _extract_json_array(raw)
    plan = db.create_study_plan(body.goal, body.subjects, body.hours_per_day, body.days)
    db.add_study_tasks(
        plan["id"],
        [
            {
                "day_number": int(t.get("day_number", 1)),
                "subject": str(t.get("subject", "")),
                "task": str(t.get("task", "")),
            }
            for t in tasks
            if t.get("task")
        ],
    )
    return {**plan, "tasks": db.list_study_tasks(plan["id"])}


@router.get("", response_model=list[StudyPlanOut])
def list_plans():
    return db.list_study_plans()


@router.get("/{plan_id}", response_model=StudyPlanWithTasks)
def get_plan(plan_id: str):
    plan = db.get_study_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {**plan, "tasks": db.list_study_tasks(plan_id)}


@router.patch("/tasks/{task_id}")
def update_task(task_id: str, body: TaskUpdate):
    db.set_task_done(task_id, body.done)
    return {"status": "updated"}


@router.delete("/{plan_id}")
def delete_plan(plan_id: str):
    if not db.get_study_plan(plan_id):
        raise HTTPException(status_code=404, detail="Plan not found")
    db.delete_study_plan(plan_id)
    return {"status": "deleted"}
