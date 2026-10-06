import pytest

from app.services.automation_service import parse_command


@pytest.mark.parametrize(
    "text,expected_action,expected_destructive",
    [
        ("open chrome", "open:chrome", False),
        ("please open vscode now", "open:vscode", False),
        ("search google for aktu syllabus", "search_google", False),
        ("search youtube for lofi beats", "search_youtube", False),
        ("open downloads", "open_downloads", False),
        ("shutdown", "shutdown", True),
        ("restart the pc", "restart", True),
        ("lock the computer", "lock", True),
        ("go to sleep", "sleep", True),
    ],
)
def test_parse_known_commands(text, expected_action, expected_destructive):
    result = parse_command(text)
    assert result is not None
    assert result.action == expected_action
    assert result.destructive == expected_destructive


def test_parse_unmatched_text_returns_none():
    assert parse_command("tell me a joke") is None


def test_search_query_extraction():
    result = parse_command("search google for best pizza in lucknow")
    assert result.args["query"] == "best pizza in lucknow"
