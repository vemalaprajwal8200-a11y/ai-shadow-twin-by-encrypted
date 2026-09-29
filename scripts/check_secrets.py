"""Check staged files or the worktree for likely credentials without printing them."""

import argparse
import re
import subprocess
import sys
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]


def _patterns() -> tuple[tuple[str, re.Pattern[str]], ...]:
    api_prefix = "s" + "k" + "-"
    jwt_prefix = "ey" + "J"
    aws_prefix = "AK" + "IA"
    role_marker = "service" + "_" + "role"
    credential_url = r"https?://[^/\s:@]+:[^/\s@]+@"
    assigned_secret = r"(?i)(?:api[_-]?key|access[_-]?token|secret|password)\s*[:=]\s*['\"][^'\"]{8,}"
    return (
        ("API-key-like value", re.compile(re.escape(api_prefix) + r"[A-Za-z0-9_-]{8,}")),
        ("JWT-like value", re.compile(re.escape(jwt_prefix) + r"[A-Za-z0-9_-]{8,}")),
        ("AWS-key-like value", re.compile(re.escape(aws_prefix) + r"[A-Z0-9]{12,}")),
        ("service-role marker", re.compile(re.escape(role_marker), re.IGNORECASE)),
        ("credential-bearing URL", re.compile(credential_url, re.IGNORECASE)),
        ("hardcoded secret assignment", re.compile(assigned_secret)),
    )


def _is_env_file(path: str) -> bool:
    name = PurePosixPath(path.replace("\\", "/")).name.lower()
    if name == ".env.example":
        return False
    return name == ".env" or name.startswith(".env.") or name.endswith(".env")


def _git_paths(*arguments: str) -> list[str]:
    result = subprocess.run(
        ["git", *arguments],
        cwd=ROOT,
        check=True,
        capture_output=True,
    )
    return [path.decode("utf-8") for path in result.stdout.split(b"\0") if path]


def _staged_text(path: str) -> str:
    result = subprocess.run(
        ["git", "show", f":{path}"],
        cwd=ROOT,
        check=True,
        capture_output=True,
    )
    return result.stdout.decode("utf-8")


def _worktree_text(path: str) -> str | None:
    file_path = ROOT / Path(path)
    if not file_path.is_file():
        return None
    try:
        return file_path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return None


def _scan(path: str, text: str) -> list[str]:
    findings = []
    patterns = _patterns()
    for line_number, line in enumerate(text.splitlines(), start=1):
        for label, pattern in patterns:
            if pattern.search(line):
                findings.append(f"{path}:{line_number}: {label}")
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--staged", action="store_true", help="check files staged for commit")
    mode.add_argument("--worktree", action="store_true", help="check visible worktree files")
    args = parser.parse_args()

    try:
        if args.staged:
            paths = _git_paths("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z")
            blocked = [path for path in paths if _is_env_file(path)]
            findings = []
            for path in paths:
                if path not in blocked:
                    findings.extend(_scan(path, _staged_text(path)))
        else:
            paths = _git_paths("ls-files", "-co", "--exclude-standard", "-z")
            blocked = []
            findings = []
            for path in paths:
                if not _is_env_file(path):
                    text = _worktree_text(path)
                    if text is not None:
                        findings.extend(_scan(path, text))
    except (OSError, subprocess.CalledProcessError, UnicodeDecodeError):
        print("FAIL: could not inspect Git files.", file=sys.stderr)
        return 2

    for path in blocked:
        print(f"FAIL: environment file staged for commit: {path}")
    for finding in findings:
        print(f"FAIL: {finding}")
    if blocked or findings:
        return 1

    label = "staged files" if args.staged else "visible worktree files"
    print(f"PASS: no environment files or likely credentials found in {label}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
