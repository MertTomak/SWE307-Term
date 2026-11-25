"""Build the CampusSlot 5.11 cost-benefit Excel workbook from scratch.

Writes raw OOXML (no openpyxl dependency, stdlib only) so this runs anywhere
without `pip install`. Produces three sheets with live formulas, not just
values, so the workbook can be audited and the assumptions changed in place:

  Assumptions  -- every input (sourced or PM-proposed), one row each
  CostBenefit  -- bookings, benefit, dev cost, cash flow, NPV, ROI, payback
  Sensitivity  -- NPV grid: admin minutes per booking x discount rate

Cached values match docs/report/5.11_operating-costs_Mert.md and
docs/report/5.11_cost-benefit-model_Mert.py; run with --check to verify.

Run:  python3 docs/report/5.11_cost-benefit-workbook_Mert.py
"""

import argparse
import xml.sax.saxutils as sax
import zipfile
from pathlib import Path

OUT = Path(__file__).parent / "5.11_cost-benefit-workbook_Mert.xlsx"


def esc(s: str) -> str:
    return sax.escape(str(s), {'"': "&quot;"})


def col_letter(n: int) -> str:
    s = ""
    while n > 0:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


class Sheet:
    def __init__(self, name: str):
        self.name = name
        self.cells: dict[tuple[int, int], str] = {}  # (row, col) -> cell XML
        self.col_widths: dict[int, float] = {}

    def ref(self, row: int, col: int) -> str:
        return f"{col_letter(col)}{row}"

    def set_text(self, row: int, col: int, text: str, bold: bool = False):
        style = ' s="1"' if bold else ""
        xml = (f'<c r="{self.ref(row, col)}" t="inlineStr"{style}>'
               f'<is><t xml:space="preserve">{esc(text)}</t></is></c>')
        self.cells[(row, col)] = xml

    def set_number(self, row: int, col: int, value: float):
        xml = f'<c r="{self.ref(row, col)}"><v>{value}</v></c>'
        self.cells[(row, col)] = xml

    def set_formula(self, row: int, col: int, formula: str, cached: float):
        xml = (f'<c r="{self.ref(row, col)}">'
               f'<f>{esc(formula)}</f><v>{cached}</v></c>')
        self.cells[(row, col)] = xml

    def width(self, col: int, w: float):
        self.col_widths[col] = w

    def to_xml(self) -> str:
        max_row = max((r for r, _ in self.cells), default=1)
        max_col = max((c for _, c in self.cells), default=1)
        cols_xml = "".join(
            f'<col min="{c}" max="{c}" width="{w}" customWidth="1"/>'
            for c, w in sorted(self.col_widths.items())
        )
        rows_by_num: dict[int, list[str]] = {}
        for (r, c), xml in self.cells.items():
            rows_by_num.setdefault(r, []).append(xml)
        rows_xml = []
        for r in range(1, max_row + 1):
            cells = sorted(
                rows_by_num.get(r, []),
                key=lambda s: s.split('r="')[1].split('"')[0],
            )
            rows_xml.append(f'<row r="{r}">{"".join(cells)}</row>')
        return (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<worksheet xmlns="http://schemas.openxmlformats.org/'
            'spreadsheetml/2006/main">'
            f'<cols>{cols_xml}</cols>'
            f'<sheetData>{"".join(rows_xml)}</sheetData>'
            "</worksheet>"
        )


def build_assumptions() -> Sheet:
    sh = Sheet("Assumptions")
    sh.width(1, 42)
    sh.width(2, 14)
    sh.width(3, 60)
    sh.set_text(1, 1, "CampusSlot 5.11 -- Cost-Benefit Assumptions", bold=True)
    rows = [
        ("Hourly rate, TL/h (C4, lower bound)", 178.73,
         "CSGB 2026 employer cost of a minimum-wage worker / 225 h"),
        ("Hourly rate sensitivity, TL/h", 250.00,
         "Unsourced team figure, 5.11.11c only"),
        ("Operating cost Scenario A, TL/yr", 18469.33, "5.11.3, free tiers"),
        ("Operating cost Scenario B, TL/yr", 61791.10,
         "5.11.3, paid plans -- used as the base case below"),
        ("Discount rate, nominal", 0.36, "TCMB 1-week repo, 23 Oct 2026"),
        ("Resources (count)", 13, "seed.ts: 5 ROOM + 4 LAB + 4 EQUIPMENT (C13)"),
        ("Bookings per resource per week", 10, "PM proposal, NOT measured (C14)"),
        ("Term weeks per year", 30, "PM proposal (C14)"),
        ("Minutes per booking, base case", 10,
         "PM proposal, NOT measured -- decides the sign of the NPV (C15)"),
        ("No-show rate", 0.15, "PM proposal, upside case only (C16)"),
        ("No-show rebooked share", 0.50, "PM proposal, upside case only (C16)"),
        ("Average reservation length, h", 2.0, "PM proposal (C16)"),
        ("Team members", 7, "5.5 plan"),
        ("Project days", 19, "5.5 plan, 18 Nov - 6 Dec 2026"),
        ("Hours per day, part-time", 3.0, "FPA assumption FP20"),
        ("Horizon, years", 3, "C18"),
    ]
    for i, (label, value, note) in enumerate(rows, start=3):
        sh.set_text(i, 1, label)
        sh.set_number(i, 2, value)
        sh.set_text(i, 3, note)
    return sh


def build_cost_benefit(a: dict) -> tuple[Sheet, dict]:
    sh = Sheet("CostBenefit")
    sh.width(1, 42)
    sh.width(2, 16)
    sh.width(3, 16)
    sh.width(4, 16)
    sh.width(5, 20)
    sh.set_text(1, 1, "5.11.5-5.11.10 -- Cost-Benefit, Scenario B base case", bold=True)

    bookings = a["resources"] * a["bookings_per_res_week"] * a["term_weeks"]
    admin_h = bookings * a["minutes"] / 60
    benefit = admin_h * a["rate"]
    dev_h = a["members"] * a["days"] * a["hours_per_day"]
    dev_cost = dev_h * a["rate"]
    opex = a["opex_b"]
    net = benefit - opex

    sh.set_text(3, 1, "Bookings per year")
    sh.set_formula(3, 2, "Assumptions!B8*Assumptions!B9*Assumptions!B10", bookings)
    sh.set_text(4, 1, "Admin hours saved per year")
    sh.set_formula(4, 2, "B3*Assumptions!B11/60", admin_h)
    sh.set_text(5, 1, "Benefit per year, TL")
    sh.set_formula(5, 2, "B4*Assumptions!B3", benefit)
    sh.set_text(6, 1, "Development hours")
    sh.set_formula(6, 2, "Assumptions!B15*Assumptions!B16*Assumptions!B17", dev_h)
    sh.set_text(7, 1, "Development cost, TL (opportunity cost, C17)")
    sh.set_formula(7, 2, "B6*Assumptions!B3", dev_cost)
    sh.set_text(8, 1, "Operating cost per year, TL (Scenario B)")
    sh.set_formula(8, 2, "Assumptions!B6", opex)
    sh.set_text(9, 1, "Net annual benefit, TL")
    sh.set_formula(9, 2, "B5-B8", net)

    sh.set_text(11, 1, "Year", bold=True)
    sh.set_text(11, 2, "Net cash flow", bold=True)
    sh.set_text(11, 3, "Discount factor", bold=True)
    sh.set_text(11, 4, "Discounted", bold=True)
    sh.set_text(11, 5, "Cumulative discounted", bold=True)

    af_terms = []
    cum = -dev_cost
    sh.set_number(12, 1, 0)
    sh.set_formula(12, 2, "-B7", -dev_cost)
    sh.set_number(12, 3, 1)
    sh.set_formula(12, 4, "B12*C12", -dev_cost)
    sh.set_formula(12, 5, "D12", -dev_cost)
    discounted = {}
    for t in range(1, a["horizon"] + 1):
        r = 12 + t
        factor = 1 / (1 + a["discount"]) ** t
        disc = net * factor
        cum += disc
        af_terms.append(factor)
        sh.set_number(r, 1, t)
        sh.set_formula(r, 2, "$B$9", net)
        sh.set_formula(r, 3, f"1/(1+Assumptions!$B$5)^A{r}", factor)
        sh.set_formula(r, 4, f"B{r}*C{r}", disc)
        sh.set_formula(r, 5, f"E{r - 1}+D{r}", cum)
        discounted[t] = (r, disc, cum)

    last_row = 12 + a["horizon"]
    npv = cum
    af_sum = sum(af_terms)
    pv_benefit = benefit * af_sum
    pv_cost = dev_cost + opex * af_sum
    roi_undisc = (benefit * a["horizon"] - dev_cost - opex * a["horizon"]) / \
                 (dev_cost + opex * a["horizon"]) * 100
    roi_disc = (pv_benefit - pv_cost) / pv_cost * 100
    payback_simple = dev_cost / net

    y2_row, _, y2_cum = discounted[a["horizon"] - 1]
    y3_row, y3_disc, _ = discounted[a["horizon"]]
    payback_disc = (a["horizon"] - 1) + (-y2_cum / y3_disc)

    sh.set_text(17, 1, "NPV, TL", bold=True)
    sh.set_formula(17, 2, f"E{last_row}", npv)
    sh.set_text(18, 1, "Sum of discount factors (years 1..horizon)")
    sh.set_formula(18, 2, "+".join(f"C{12 + t}" for t in range(1, a["horizon"] + 1)), af_sum)
    sh.set_text(19, 1, "PV of benefits, TL")
    sh.set_formula(19, 2, "B5*B18", pv_benefit)
    sh.set_text(20, 1, "PV of costs, TL")
    sh.set_formula(20, 2, "B7+B8*B18", pv_cost)
    sh.set_text(21, 1, "ROI undiscounted (%), horizon years")
    sh.set_formula(
        21, 2,
        f"((B5*{a['horizon']}-B7-B8*{a['horizon']})/(B7+B8*{a['horizon']}))*100",
        roi_undisc,
    )
    sh.set_text(22, 1, "ROI discounted (%)")
    sh.set_formula(22, 2, "(B19-B20)/B20*100", roi_disc)
    sh.set_text(23, 1, "Payback, simple, years")
    sh.set_formula(23, 2, "B7/B9", payback_simple)
    sh.set_text(24, 1, f"Payback, discounted, years (crosses zero in year {a['horizon']})")
    sh.set_formula(24, 2, f"({a['horizon'] - 1})+(-E{y2_row}/D{y3_row})", payback_disc)

    results = dict(bookings=bookings, admin_h=admin_h, benefit=benefit,
                   dev_h=dev_h, dev_cost=dev_cost, net=net, npv=npv,
                   roi_undisc=roi_undisc, roi_disc=roi_disc,
                   payback_simple=payback_simple, payback_disc=payback_disc)
    return sh, results


def build_sensitivity(a: dict) -> Sheet:
    sh = Sheet("Sensitivity")
    sh.width(1, 24)
    for c in range(2, 5):
        sh.width(c, 14)
    sh.set_text(1, 1, "5.11.11a -- NPV sensitivity: minutes/booking x discount rate", bold=True)
    sh.set_text(3, 1, "Minutes per booking", bold=True)
    discounts = [0.31, 0.36, 0.41]
    for j, d in enumerate(discounts):
        sh.set_number(3, 2 + j, d)
    minutes_list = [5, 8, 10, 12, 15]
    for i, m in enumerate(minutes_list):
        row = 4 + i
        sh.set_number(row, 1, m)
        for j, d in enumerate(discounts):
            col = 2 + j
            cl = col_letter(col)
            af3 = sum(1 / (1 + d) ** t for t in (1, 2, 3))
            benefit = a["resources"] * a["bookings_per_res_week"] * a["term_weeks"] \
                * m / 60 * a["rate"]
            net = benefit - a["opex_b"]
            dev_cost = a["members"] * a["days"] * a["hours_per_day"] * a["rate"]
            npv = -dev_cost + net * af3
            formula = (
                f"-CostBenefit!$B$7+"
                f"(Assumptions!$B$8*Assumptions!$B$9*Assumptions!$B$10*$A{row}/60"
                f"*Assumptions!$B$3-Assumptions!$B$6)*"
                f"(1/(1+{cl}$3)+1/(1+{cl}$3)^2+1/(1+{cl}$3)^3)"
            )
            sh.set_formula(row, col, formula, npv)
    sh.set_text(10, 1, "Note: NPV changes sign between 8 and 10 minutes at every")
    sh.set_text(11, 1, "discount rate in this range (5.11.11a).")
    return sh


def workbook_xml(sheet_names: list[str]) -> str:
    sheets = "".join(
        f'<sheet name="{esc(n)}" sheetId="{i + 1}" r:id="rId{i + 1}"/>'
        for i, n in enumerate(sheet_names)
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '<calcPr fullCalcOnLoad="1"/>'
        f'<sheets>{sheets}</sheets>'
        "</workbook>"
    )


def workbook_rels_xml(n: int) -> str:
    rels = "".join(
        f'<Relationship Id="rId{i + 1}" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
        f'Target="worksheets/sheet{i + 1}.xml"/>'
        for i in range(n)
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        f"{rels}"
        "</Relationships>"
    )


CONTENT_TYPES = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.'
    'relationships+xml"/>'
    '<Default Extension="xml" ContentType="application/xml"/>'
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-'
    'officedocument.spreadsheetml.sheet.main+xml"/>'
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-'
    'officedocument.spreadsheetml.styles+xml"/>'
    + "".join(
        f'<Override PartName="/xl/worksheets/sheet{i}.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.'
        'worksheet+xml"/>'
        for i in (1, 2, 3)
    )
    + "</Types>"
)

ROOT_RELS = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/'
    'relationships/officeDocument" Target="xl/workbook.xml"/>'
    "</Relationships>"
)

STYLES = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    '<fonts count="2">'
    '<font><sz val="11"/><name val="Calibri"/></font>'
    '<font><b/><sz val="11"/><name val="Calibri"/></font>'
    "</fonts>"
    '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>'
    '<borders count="1"><border/></borders>'
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0"/></cellStyleXfs>'
    '<cellXfs count="2">'
    '<xf numFmtId="0" fontId="0" xfId="0"/>'
    '<xf numFmtId="0" fontId="1" xfId="0" applyFont="1"/>'
    "</cellXfs>"
    "</styleSheet>"
)

ASSUMPTIONS = dict(
    rate=178.73, opex_b=61791.10, discount=0.36,
    resources=13, bookings_per_res_week=10, term_weeks=30, minutes=10,
    members=7, days=19, hours_per_day=3.0, horizon=3,
)


def build(check: bool = False):
    sh_assumptions = build_assumptions()
    sh_cb, results = build_cost_benefit(ASSUMPTIONS)
    sh_sens = build_sensitivity(ASSUMPTIONS)
    sheets = [sh_assumptions, sh_cb, sh_sens]

    if check:
        expected = dict(bookings=3900, admin_h=650.0, benefit=116174.50,
                        dev_h=399, dev_cost=71313.27, net=54383.40,
                        npv=19697.01, roi_undisc=35.78, roi_disc=11.27,
                        payback_simple=1.31, payback_disc=2.09)
        ok = True
        for k, exp in expected.items():
            got = results[k]
            if abs(got - exp) > max(0.5, abs(exp) * 0.001):
                print(f"MISMATCH {k}: workbook={got:.4f} report={exp}")
                ok = False
        print("All figures match the report." if ok else
              "Mismatches found -- fix before committing.")

    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES)
        z.writestr("_rels/.rels", ROOT_RELS)
        z.writestr("xl/workbook.xml", workbook_xml([s.name for s in sheets]))
        z.writestr("xl/_rels/workbook.xml.rels", workbook_rels_xml(len(sheets)))
        z.writestr("xl/styles.xml", STYLES)
        for i, sh in enumerate(sheets, start=1):
            z.writestr(f"xl/worksheets/sheet{i}.xml", sh.to_xml())
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true",
                     help="verify computed values against the report before writing")
    args = ap.parse_args()
    build(check=args.check)
