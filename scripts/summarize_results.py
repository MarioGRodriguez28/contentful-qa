"""Summarise the JUnit reports written by the test commands.

Reads reports/*-junit.xml (and reports/k6-summary.json when it exists) and writes
reports/summary.md with one row per suite: total, passed, failed, skipped and the
average time of a test. Standard library only.

Usage: python3 scripts/summarize_results.py [reports_dir]
"""
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

SUITES = {
    "api-junit.xml": "REST API (Axios, Vitest)",
    "postman-junit.xml": "REST API (Postman, Newman)",
    "graphql-junit.xml": "GraphQL API (Axios, Vitest)",
    "ui-junit.xml": "UI (Playwright)",
}


def summarize_junit(path):
    """Counts test cases in one JUnit file. A skipped case is not counted as passed."""
    total = failed = skipped = 0
    seconds = 0.0
    for case in ET.parse(path).getroot().iter("testcase"):
        total += 1
        seconds += float(case.get("time") or 0)
        if case.find("failure") is not None or case.find("error") is not None:
            failed += 1
        elif case.find("skipped") is not None:
            skipped += 1
    passed = total - failed - skipped
    average_ms = (seconds / total * 1000) if total else 0.0
    return {"total": total, "passed": passed, "failed": failed, "skipped": skipped, "average_ms": average_ms}


def summarize_k6(path):
    metrics = json.loads(Path(path).read_text())["metrics"]
    duration = metrics["http_req_duration"]
    return {
        "requests": int(metrics["http_reqs"]["count"]),
        "failed_rate": metrics["http_req_failed"]["value"],
        "average_ms": duration["avg"],
        "p95_ms": duration["p(95)"],
    }


def render(rows, k6):
    lines = ["# Test results", "", "| Suite | Total | Passed | Failed | Skipped | Average per test |", "|---|---|---|---|---|---|"]
    for name, row in rows:
        lines.append(f"| {name} | {row['total']} | {row['passed']} | {row['failed']} | {row['skipped']} | {row['average_ms']:.0f} ms |")
    total = sum(r["total"] for _, r in rows)
    passed = sum(r["passed"] for _, r in rows)
    failed = sum(r["failed"] for _, r in rows)
    skipped = sum(r["skipped"] for _, r in rows)
    lines.append(f"| **All** | **{total}** | **{passed}** | **{failed}** | **{skipped}** | |")
    if k6:
        lines += [
            "",
            "## Load check (k6)",
            "",
            f"{k6['requests']} requests, {k6['failed_rate'] * 100:.2f}% failed, "
            f"average {k6['average_ms']:.0f} ms, p95 {k6['p95_ms']:.0f} ms.",
        ]
    return "\n".join(lines) + "\n"


def main(argv):
    reports = Path(argv[1] if len(argv) > 1 else "reports")
    rows = [(label, summarize_junit(reports / name)) for name, label in SUITES.items() if (reports / name).exists()]
    if not rows:
        print(f"No JUnit reports found in {reports}. Run the test commands first.", file=sys.stderr)
        return 1
    k6_path = reports / "k6-summary.json"
    markdown = render(rows, summarize_k6(k6_path) if k6_path.exists() else None)
    (reports / "summary.md").write_text(markdown)
    print(markdown)
    return 1 if any(row["failed"] for _, row in rows) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
