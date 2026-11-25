"""CampusSlot 5.11 cost-benefit model.

Reproduces every figure in section 5.11.5 to 5.11.11 of
docs/report/5.11_operating-costs_Mert.md, so the arithmetic can be re-run when
Zeynep's survey replaces the proposed benefit parameters (assumptions C13-C16).

Run:  python3 docs/report/5.11_cost-benefit-model_Mert.py
No dependencies beyond the standard library.

Owner: Mert (Project Manager / Value-Finance Analyst).
All inputs below are either sourced (see the cited section) or declared as a
PM proposal that has not been measured. Do not change a sourced value without
updating its citation in 5.11.
"""

# --------------------------------------------------------------------------
# Sourced inputs (citations in 5.11.1 and 5.11.4)
# --------------------------------------------------------------------------
RATE_LOW = 178.73      # TL/h. C4: CSGB 2026 min-wage employer cost / 225 h. LOWER BOUND.
RATE_SENS = 250.00     # TL/h. Unsourced team figure, sensitivity only (5.11.11c).
OPEX_A = 18_469.33     # TL/yr. Scenario A, free tiers, pilot (5.11.3).
OPEX_B = 61_791.10     # TL/yr. Scenario B, paid, campus scale (5.11.3). BASE CASE.
DISCOUNT = 0.36        # TCMB 1-week repo rate, effective 23 Oct 2026 (5.11.4).
DISCOUNT_RANGE = (0.31, 0.36, 0.41)   # +/- 5 points (5.11.4).

# --------------------------------------------------------------------------
# PM-proposed benefit parameters -- NOT MEASURED (assumptions C13-C16).
# Zeynep's survey and admin interview (25 Nov 2026) must replace these.
# --------------------------------------------------------------------------
RESOURCES = 13             # C13. seed.ts: 5 ROOM + 4 LAB + 4 EQUIPMENT.
BOOKINGS_PER_RES_WEEK = 10  # C14.
TERM_WEEKS = 30            # C14.
MINUTES_PER_BOOKING = 10   # C15. DECIDES THE RESULT: NPV flips sign between 8 and 10.
NOSHOW_RATE = 0.15         # C16. Upside case only.
NOSHOW_REBOOKED = 0.50     # C16. Share of released slots re-used.
SLOT_HOURS = 2.0           # C16. Average reservation length.

# --------------------------------------------------------------------------
# Development cost -- opportunity cost, not cash (C17).
# --------------------------------------------------------------------------
MEMBERS, PROJECT_DAYS, HOURS_PER_DAY = 7, 19, 3.0   # 5.5 plan; 3 h/day per FP20.
DEV_HOURS = MEMBERS * PROJECT_DAYS * HOURS_PER_DAY  # = 399 h

HORIZON = 3       # C18. Years. 5 as sensitivity.
COCOMO_PM = 14.38  # Person-months from Basic COCOMO, organic mode (5.5.8).
HOURS_PER_PM = 225  # C4 basis.


def annuity_factor(rate, years):
    """Sum of discount factors for t = 1..years."""
    return sum(1 / (1 + rate) ** t for t in range(1, years + 1))


def bookings_per_year():
    return RESOURCES * BOOKINGS_PER_RES_WEEK * TERM_WEEKS


def admin_benefit(rate=RATE_LOW, minutes=MINUTES_PER_BOOKING):
    """Benefit 1: administrative time saved (5.11.6). The base-case benefit."""
    hours = bookings_per_year() * minutes / 60
    return hours * rate, hours


def noshow_benefit(rate=RATE_LOW):
    """Benefit 2: capacity recovered from no-shows. UPSIDE ONLY -- it is a proxy,
    not a cash saving, so 5.11.7 keeps it out of the base case."""
    hours = bookings_per_year() * NOSHOW_RATE * NOSHOW_REBOOKED * SLOT_HOURS
    return hours * rate, hours


def evaluate(opex=OPEX_B, rate=RATE_LOW, discount=DISCOUNT, years=HORIZON,
             minutes=MINUTES_PER_BOOKING, include_upside=False):
    """Return the full result set for one case."""
    benefit, _ = admin_benefit(rate, minutes)
    if include_upside:
        benefit += noshow_benefit(rate)[0]

    dev = DEV_HOURS * rate
    net = benefit - opex
    af = annuity_factor(discount, years)

    npv = -dev + net * af
    pv_benefit = benefit * af
    pv_cost = dev + opex * af

    return {
        "benefit_per_year": benefit,
        "dev_cost": dev,
        "net_per_year": net,
        "annuity_factor": af,
        "npv": npv,
        # ROI = (total benefits - total costs) / total costs  (5.11.9)
        "roi_simple": (benefit * years - dev - opex * years)
                      / (dev + opex * years) * 100,
        "roi_discounted": (pv_benefit - pv_cost) / pv_cost * 100,
        "payback_simple": dev / net if net > 0 else None,
        "payback_discounted": _discounted_payback(dev, net, discount, years),
    }


def _discounted_payback(dev, net, discount, years):
    """Year in which cumulative discounted cash flow turns positive (5.11.10)."""
    if net <= 0:
        return None
    cumulative = -dev
    for t in range(1, years + 1):
        flow = net / (1 + discount) ** t
        if cumulative + flow >= 0:
            return (t - 1) + (-cumulative / flow)
        cumulative += flow
    return None


def cash_flow_table(opex=OPEX_B, discount=DISCOUNT, years=HORIZON):
    """Rows for the table in 5.11.8 and the chart in
    docs/diagrams/5.11_cumulative-cashflow_Mert.mmd."""
    r = evaluate(opex=opex, discount=discount, years=years)
    rows = [(0, -r["dev_cost"], -r["dev_cost"], -r["dev_cost"])]
    cumulative = -r["dev_cost"]
    for t in range(1, years + 1):
        discounted = r["net_per_year"] / (1 + discount) ** t
        cumulative += discounted
        rows.append((t, r["net_per_year"], discounted, cumulative))
    return rows


if __name__ == "__main__":
    base = evaluate()
    benefit, admin_hours = admin_benefit()
    noshow_tl, noshow_hours = noshow_benefit()

    print("5.11.6 BENEFITS")
    print(f"  bookings per year        {bookings_per_year():>14,}")
    print(f"  admin hours saved/yr     {admin_hours:>14,.1f}")
    print(f"  Benefit 1 (base) TL/yr   {benefit:>14,.2f}")
    print(f"  no-show hours recov./yr  {noshow_hours:>14,.1f}")
    print(f"  Benefit 2 (upside) TL/yr {noshow_tl:>14,.2f}")

    print("\n5.11.5 DEVELOPMENT COST")
    print(f"  team hours               {DEV_HOURS:>14,.0f}")
    print(f"  opportunity cost TL      {base['dev_cost']:>14,.2f}")
    cocomo_cost = COCOMO_PM * HOURS_PER_PM * RATE_LOW
    print(f"  COCOMO equivalent TL     {cocomo_cost:>14,.2f}"
          f"   ({cocomo_cost / base['dev_cost']:.2f}x)")

    print(f"\n5.11.8-5.11.10 BASE CASE (Scenario B, {DISCOUNT:.0%}, {HORIZON} yr)")
    print(f"  net benefit TL/yr        {base['net_per_year']:>14,.2f}")
    print(f"  annuity factor           {base['annuity_factor']:>14.6f}")
    print(f"  NPV TL                   {base['npv']:>14,.2f}")
    print(f"  ROI undiscounted         {base['roi_simple']:>13.2f}%")
    print(f"  ROI discounted           {base['roi_discounted']:>13.2f}%")
    print(f"  payback simple (yr)      {base['payback_simple']:>14.2f}")
    print(f"  payback discounted (yr)  {base['payback_discounted']:>14.2f}")

    print("\n  discounted cash flow:")
    print(f"    {'t':>2}  {'net flow':>14}  {'discounted':>14}  {'cumulative':>14}")
    for t, flow, disc, cum in cash_flow_table():
        print(f"    {t:>2}  {flow:>14,.2f}  {disc:>14,.2f}  {cum:>14,.2f}")

    print("\n5.11.11a SENSITIVITY: admin minutes per booking x discount rate (NPV)")
    print("  min/bk |" + "".join(f"{r:>14.0%}" for r in DISCOUNT_RANGE))
    for m in (5, 8, 10, 12, 15):
        cells = "".join(f"{evaluate(discount=r, minutes=m)['npv']:>15,.0f}"
                        for r in DISCOUNT_RANGE)
        marker = "  <- base" if m == MINUTES_PER_BOOKING else ""
        print(f"  {m:>6} |{cells}{marker}")
    print("  NOTE: the NPV changes sign between 8 and 10 minutes at every rate.")

    print("\n5.11.11b SENSITIVITY: scenario x horizon x benefit set")
    header = f"  {'hosting':<14}{'yr':>3}  {'upside':<7}{'NPV':>13}{'ROI disc':>10}{'payback':>9}"
    print(header)
    for label, opex in (("B paid", OPEX_B), ("A free tiers", OPEX_A)):
        for years in (3, 5):
            for upside in (False, True):
                r = evaluate(opex=opex, years=years, include_upside=upside)
                print(f"  {label:<14}{years:>3}  {str(upside):<7}"
                      f"{r['npv']:>13,.0f}{r['roi_discounted']:>9.1f}%"
                      f"{r['payback_simple']:>8.2f}y")

    print(f"\n5.11.11c SENSITIVITY: hourly rate {RATE_SENS:.0f} TL/h")
    high = evaluate(rate=RATE_SENS)
    print(f"  benefit/yr {high['benefit_per_year']:>12,.2f}   "
          f"dev {high['dev_cost']:>11,.2f}   net {high['net_per_year']:>11,.2f}")
    print(f"  NPV {high['npv']:>11,.0f}   ROI disc {high['roi_discounted']:>6.1f}%   "
          f"payback {high['payback_simple']:.2f}y")
