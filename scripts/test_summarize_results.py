import json
import tempfile
import unittest
from pathlib import Path

import summarize_results as s

JUNIT = """<?xml version="1.0"?>
<testsuites>
  <testsuite name="a" tests="4">
    <testcase name="passes" time="0.2"/>
    <testcase name="also passes" time="0.4"/>
    <testcase name="fails" time="0.6"><failure message="boom"/></testcase>
    <testcase name="skipped" time="0"><skipped/></testcase>
  </testsuite>
</testsuites>
"""


class SummarizeTests(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())

    def write(self, name, text):
        (self.dir / name).write_text(text)

    def test_counts_passed_failed_and_skipped_apart(self):
        self.write("api-junit.xml", JUNIT)
        row = s.summarize_junit(self.dir / "api-junit.xml")
        self.assertEqual((row["total"], row["passed"], row["failed"], row["skipped"]), (4, 2, 1, 1))

    def test_averages_time_over_every_case(self):
        self.write("api-junit.xml", JUNIT)
        self.assertAlmostEqual(s.summarize_junit(self.dir / "api-junit.xml")["average_ms"], 300.0)

    def test_an_error_element_counts_as_a_failure(self):
        self.write("x.xml", '<testsuites><testsuite><testcase name="t" time="1"><error/></testcase></testsuite></testsuites>')
        self.assertEqual(s.summarize_junit(self.dir / "x.xml")["failed"], 1)

    def test_an_empty_report_does_not_divide_by_zero(self):
        self.write("x.xml", "<testsuites/>")
        self.assertEqual(s.summarize_junit(self.dir / "x.xml")["average_ms"], 0.0)

    def test_reads_the_k6_summary(self):
        self.write("k6-summary.json", json.dumps({"metrics": {
            "http_reqs": {"count": 312},
            "http_req_failed": {"value": 0},
            "http_req_duration": {"avg": 27.5, "p(95)": 39.2},
        }}))
        self.assertEqual(s.summarize_k6(self.dir / "k6-summary.json")["requests"], 312)

    def test_main_writes_the_markdown_and_reports_failures_in_the_exit_code(self):
        self.write("api-junit.xml", JUNIT)
        self.assertEqual(s.main(["x", str(self.dir)]), 1)
        text = (self.dir / "summary.md").read_text()
        self.assertIn("| REST API (Axios, Vitest) | 4 | 2 | 1 | 1 |", text)
        self.assertIn("| **All** | **4** | **2** | **1** | **1** |", text)

    def test_main_succeeds_when_everything_passes(self):
        self.write("ui-junit.xml", '<testsuites><testsuite><testcase name="t" time="0.1"/></testsuite></testsuites>')
        self.assertEqual(s.main(["x", str(self.dir)]), 0)

    def test_main_fails_clearly_when_there_are_no_reports(self):
        self.assertEqual(s.main(["x", str(self.dir)]), 1)


if __name__ == "__main__":
    unittest.main()
