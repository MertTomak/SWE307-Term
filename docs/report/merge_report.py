"""Merge docs/report/*.md into one ordered draft, then (optionally) render a PDF.

Run:  python3 docs/report/merge_report.py
      python3 docs/report/merge_report.py --pdf     # also run pandoc

Why this exists: the report is written as one file per sub-section, one owner
per file (docs/report/5.X_topic_Name.md), so people can work in parallel
without merge conflicts. This script is the single place that knows the final
order (5.1 to 5.15) and which files belong to which heading. It also reports
which sections have no file yet, so "did we forget a section" is a command,
not a manual re-read of the whole report the night before submission.

Update MANIFEST when a new report file is added or a missing section is
filled in -- that is the only thing that needs to change.
"""

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

REPORT_DIR = Path(__file__).parent
OUTPUT_MD = REPORT_DIR / "CampusSlot_Report_DRAFT.md"
OUTPUT_HTML = REPORT_DIR / "CampusSlot_Report_DRAFT.html"
OUTPUT_PDF = REPORT_DIR / "CampusSlot_Report_DRAFT.pdf"

# No LaTeX install assumed. Render via pandoc -> HTML -> headless Chrome print,
# since every machine on the team already has Chrome but not pdflatex.
CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",  # macOS
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",  # Windows
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",  # Windows, 32-bit install
    "google-chrome", "google-chrome-stable", "chromium", "chromium-browser",  # Linux / PATH
]

# (section id, display title, [files in this section, in order], owner, status)
# Status is only shown for sections with no file yet; update as work lands.
MANIFEST = [
    ("5.1", "Executive Summary",
     ["5.1_executive-summary_Mert.md"], "Mert", None),
    ("5.2", "Problem Definition, Scope and Stakeholders",
     [], "Zeynep", "Not started. Depends on fact-finding (survey/interviews)."),
    ("5.3", "Academic Literature Review",
     [], "Arzum", "In progress. 8 peer-reviewed sources verified by PM; write-up pending."),
    ("5.4", "Fact-Finding and Requirements Analysis",
     ["5.4_requirements_Mert.md"], "Zeynep (PM draft)", None),
    ("5.5", "Software Process Model and Project Management",
     ["5.5_planning_Mert.md", "5.5_FPA-COCOMO_Mert.md"], "Mert", None),
    ("5.6", "Analysis Models",
     ["5.6_use-cases_Gorkem.md", "5.6_decision-tables_Gorkem.md"],
     "Zeynep / Görkem / Arzum",
     "Partial: use cases and decision tables done (Görkem). "
     "User stories + DFDs (Zeynep) and "
     "activity diagram text (Arzum) still missing."),
    ("5.7", "Software Design",
     ["5.7_component-deployment_Batuhan.md", "5.7_state-machine_Enes.md",
      "5.7_design-patterns_Batuhan.md", "5.7_class-diagram_Erol.md"],
     "Batuhan / Enes / Erol",
     "Partial: component, deployment, state machine, design patterns (draft) and "
     "class diagram (Erol, PNG pending H44) done. Sequence diagram still missing."),
    ("5.8", "Technical Architecture",
     ["5.8_architecture-stack_Batuhan.md", "5.8.3_data-model_Erol.md",
      "5.8_api-design_Batuhan.md", "5.8.5_security-privacy_Batuhan.md"],
     "Batuhan / Erol", None),
    ("5.9", "Alternative Approaches",
     ["5.9_alternatives_Batuhan.md"], "Batuhan", None),
    ("5.10", "Feasibility Analysis",
     ["5.10_feasibility_Mert.md"], "Mert", None),
    ("5.11", "Value and Benefit Analysis",
     ["5.11_operating-costs_Mert.md"], "Mert", None),
    ("5.12", "Implementation and Testing",
     ["5.12_test-plan_Gorkem.md"], "Görkem",
     "Partial: test plan done. Test results, screenshots and run "
     "instructions after the test run (1-3 Dec)."),
    ("5.13-5.14", "Team Roles and Contribution Matrix / AI Usage Statement",
     ["5.13-5.14_report-text_Mert.md"], "Mert", None),
    ("5.15", "References",
     [], "Arzum", "Not started. Should be assembled last, from every section's own references."),
]


def section_heading(section_id: str, title: str) -> str:
    return f"# {section_id} {title}\n"


def missing_block(owner: str, status: str) -> str:
    return (
        f"> **[MISSING]** No file for this section yet. Owner: {owner}. "
        f"{status}\n"
    )


def build() -> tuple[str, list[str]]:
    parts = [
        "---\ntitle: \"CampusSlot -- SWE307 Term Project Report (DRAFT)\"\n"
        "date: \"Draft assembled, not the final submission\"\n---\n",
    ]
    missing = []
    for section_id, title, files, owner, status in MANIFEST:
        parts.append(section_heading(section_id, title))
        if not files:
            parts.append(missing_block(owner, status or "Not started."))
            missing.append(f"{section_id} {title} (owner: {owner})")
            continue
        for fname in files:
            fpath = REPORT_DIR / fname
            if not fpath.exists():
                parts.append(f"> **[MISSING FILE]** `{fname}` listed in the "
                             f"manifest but not found on disk.\n")
                missing.append(f"{section_id} {title}: {fname} (listed but absent)")
                continue
            text = fpath.read_text(encoding="utf-8")
            # Report files already start with their own "## 5.x ..." heading;
            # demote nothing, just insert as-is under the "# 5.x Title" anchor.
            parts.append(text.strip() + "\n")
    return "\n\n".join(parts), missing


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", action="store_true",
                     help="also render a PDF with pandoc (requires pandoc on PATH)")
    args = ap.parse_args()

    merged, missing = build()
    OUTPUT_MD.write_text(merged, encoding="utf-8")
    print(f"Wrote {OUTPUT_MD} ({len(merged):,} chars)")

    if missing:
        print(f"\n{len(missing)} section(s) still missing or incomplete:")
        for m in missing:
            print(f"  - {m}")
    else:
        print("\nAll sections in the manifest have a file. Check MANIFEST is "
              "itself complete (5.1-5.15) before trusting this.")

    if args.pdf:
        render_pdf()


def find_chrome() -> str:
    for candidate in CHROME_CANDIDATES:
        if candidate.startswith("/"):
            if Path(candidate).exists():
                return candidate
        else:
            found = shutil.which(candidate)
            if found:
                return found
    raise FileNotFoundError(
        "No Chrome/Chromium found. Install Google Chrome, or install "
        "pdflatex and render with: pandoc " + str(OUTPUT_MD) +
        " -o " + str(OUTPUT_PDF) + " --pdf-engine=pdflatex --toc"
    )


def render_pdf():
    if shutil.which("pandoc") is None:
        print("pandoc not found on PATH (brew install pandoc).", file=sys.stderr)
        sys.exit(1)
    subprocess.run(
        ["pandoc", str(OUTPUT_MD), "-o", str(OUTPUT_HTML), "--standalone",
         "--toc", "--toc-depth=2", "--metadata",
         "title=CampusSlot -- SWE307 Term Project Report (DRAFT)"],
        check=True,
    )
    try:
        chrome = find_chrome()
    except FileNotFoundError as e:
        print(f"\n{e}", file=sys.stderr)
        sys.exit(1)
    subprocess.run(
        [chrome, "--headless", "--disable-gpu", "--no-sandbox",
         f"--print-to-pdf={OUTPUT_PDF}", "--print-to-pdf-no-header",
         f"file://{OUTPUT_HTML.resolve()}"],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    print(f"\nWrote {OUTPUT_HTML}\nWrote {OUTPUT_PDF}")


if __name__ == "__main__":
    main()
