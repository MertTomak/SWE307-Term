"""5.6 Decision tables (Görkem): build the full tables, check the reduced ones.

Run:  python docs/report/5.6_decision-tables_Gorkem.py

What it does
1. Builds the full limited-entry decision table for
   DT-1 "Reservation request evaluation" (R1-R5, 2^5 = 32 rules) and
   DT-2 "Check-in, no-show and penalty" (R7-R9, 2^5 = 32 rules)
   from the rules as written in 5.4 and 5.8 (rule chain 5.8.4.7,
   check-in logic 5.8.4.8, scheduler job J1 in 5.8.4.9).
2. Repeats the reduction steps of 5.6.5 (merge two rules that have the same
   actions and differ in one condition only) and prints the number of rules
   after each step.
3. Checks that the reduced tables written in the report give the same action
   as the full table for every one of the 32 rules, and that no rule is covered
   twice. The script stops with an error if a reduced table is wrong.
4. With --markdown it prints the full tables as Markdown for the report.

The script is a check of the tables, not part of the application.
"""

import itertools
import sys

Y, N, ANY = "Y", "N", "-"

# ---------------------------------------------------------------- DT-1 (R1-R5)
# Conditions in the order of the task document.
DT1_CONDITIONS = [
    ("C1", "User has a running penalty (R4)"),
    ("C2", "Time slot is free on this resource (R3)"),
    ("C3", "Duration is at most 3 hours (R1)"),
    ("C4", "Active reservation limit not reached (R2)"),
    ("C5", "Resource type is EQUIPMENT (R5)"),
]


def dt1_action(c1, c2, c3, c4, c5):
    """Outcome of E07 for one combination.

    The rule chain (5.8.4.7) checks R1, R4, R2, R3 in this order and stops at
    the first failure, so the rejection reason is the first rule that fails.
    """
    if c3 == N:
        return "Reject: R1 (RULE_R1_MAX_DURATION)"
    if c1 == Y:
        return "Reject: R4 (RULE_R4_ACTIVE_PENALTY)"
    if c4 == N:
        return "Reject: R2 (RULE_R2_ACTIVE_LIMIT)"
    if c2 == N:
        return "Reject: R3 (RULE_R3_OVERLAP)"
    if c5 == Y:
        return "Create PENDING_APPROVAL"
    return "Create CONFIRMED"


# Reduced DT-1 as written in the report (C1, C2, C3, C4, C5) -> action.
DT1_REDUCED = [
    ((ANY, ANY, N, ANY, ANY), "Reject: R1 (RULE_R1_MAX_DURATION)"),
    ((Y, ANY, Y, ANY, ANY), "Reject: R4 (RULE_R4_ACTIVE_PENALTY)"),
    ((N, ANY, Y, N, ANY), "Reject: R2 (RULE_R2_ACTIVE_LIMIT)"),
    ((N, N, Y, Y, ANY), "Reject: R3 (RULE_R3_OVERLAP)"),
    ((N, Y, Y, Y, Y), "Create PENDING_APPROVAL"),
    ((N, Y, Y, Y, N), "Create CONFIRMED"),
]

# Order in which the conditions are merged in 5.6.5 (index into the tuple).
DT1_MERGE_ORDER = [4, 1, 3, 0]  # C5, C2, C4, C1

# ---------------------------------------------------------------- DT-2 (R7-R9)
# Scope: one CONFIRMED reservation of the user on this resource. Wrong code,
# no reservation, PENDING_APPROVAL and ALREADY_CHECKED_IN are handled before
# the table (UC-05 alternative flows 5a, 6a, 6d, 6e).
DT2_CONDITIONS = [
    ("C1", "The owner sends a check-in for this reservation now (R7)"),
    ("C2", "now >= startTime - 10 min (window has opened) (R7)"),
    ("C3", "now <= startTime + 15 min (window has not closed) (R7, R8)"),
    ("C4", "User has 3 or more NO_SHOW in the last 30 days, this one included (R9)"),
    ("C5", "User already has a running penalty (R9)"),
]

IMPOSSIBLE = "Impossible (window cannot be both not open and closed)"


def dt2_action(c1, c2, c3, c4, c5):
    """Outcome for one CONFIRMED reservation at the moment `now`.

    C1 = Y is a check-in request (E11). C1 = N is a scheduler run (job J1)
    with no check-in request.
    """
    if c2 == N and c3 == N:
        # start - 10 min < start + 15 min, so "before the window" and
        # "after the window" cannot both be true.
        return IMPOSSIBLE
    if c1 == Y:
        if c2 == N:
            return "Refuse check-in: too early (RULE_R7_TOO_EARLY)"
        if c3 == Y:
            return "Accept check-in: CHECKED_IN"
        return "Refuse check-in: too late (RULE_R7_TOO_LATE)"
    if c3 == Y:
        return "No change (stays CONFIRMED)"
    if c4 == Y and c5 == N:
        return "Set NO_SHOW + create 7-day penalty"
    return "Set NO_SHOW"


DT2_REDUCED = [
    ((ANY, N, N, ANY, ANY), IMPOSSIBLE),
    ((Y, N, Y, ANY, ANY), "Refuse check-in: too early (RULE_R7_TOO_EARLY)"),
    ((Y, Y, Y, ANY, ANY), "Accept check-in: CHECKED_IN"),
    ((Y, Y, N, ANY, ANY), "Refuse check-in: too late (RULE_R7_TOO_LATE)"),
    ((N, ANY, Y, ANY, ANY), "No change (stays CONFIRMED)"),
    ((N, Y, N, N, ANY), "Set NO_SHOW"),
    ((N, Y, N, Y, Y), "Set NO_SHOW"),
    ((N, Y, N, Y, N), "Set NO_SHOW + create 7-day penalty"),
]

DT2_MERGE_ORDER = [4, 3, 1]  # C5, C4, C2 (after removing impossible rules)


# ---------------------------------------------------------------- helpers
def full_table(action):
    """All 32 combinations. C1 changes slowest, C5 fastest (Y before N)."""
    return [(combo, action(*combo)) for combo in itertools.product([Y, N], repeat=5)]


def matches(pattern, combo):
    return all(p == ANY or p == c for p, c in zip(pattern, combo))


def check_reduced(name, full, reduced):
    for combo, act in full:
        hits = [a for p, a in reduced if matches(p, combo)]
        if len(hits) != 1:
            sys.exit(f"{name}: rule {combo} is covered {len(hits)} times")
        if hits[0] != act:
            sys.exit(f"{name}: rule {combo} gives '{hits[0]}', full table says '{act}'")
    covered = sum(2 ** p.count(ANY) for p, _ in reduced)
    if covered != 32:
        sys.exit(f"{name}: reduced table covers {covered} rules, not 32")


def merge_step(rules, idx):
    """Merge every pair that has the same action and differs only at idx."""
    rules = list(rules)
    out, used = [], set()
    for i, (p, a) in enumerate(rules):
        if i in used:
            continue
        for j in range(i + 1, len(rules)):
            if j in used:
                continue
            q, b = rules[j]
            if a == b and p[idx] != q[idx] and ANY not in (p[idx], q[idx]) and all(
                p[k] == q[k] for k in range(5) if k != idx
            ):
                merged = tuple(ANY if k == idx else p[k] for k in range(5))
                out.append((merged, a))
                used.update((i, j))
                break
        else:
            out.append((p, a))
            used.add(i)
    return out


def show_steps(name, full, order, drop_impossible=False):
    rules = list(full)
    print(f"{name}: full table {len(rules)} rules")
    if drop_impossible:
        rules = [r for r in rules if r[1] != IMPOSSIBLE]
        print(f"  remove impossible combinations -> {len(rules)} rules")
    for idx in order:
        rules = merge_step(rules, idx)
        print(f"  merge on C{idx + 1} -> {len(rules)} rules")
    return rules


def markdown(full, conditions):
    head = "| Rule | " + " | ".join(c for c, _ in conditions) + " | Action |"
    sep = "|---|" + "---|" * len(conditions) + "---|"
    lines = [head, sep]
    for n, (combo, act) in enumerate(full, 1):
        lines.append(f"| {n} | " + " | ".join(combo) + f" | {act} |")
    return "\n".join(lines)


def main():
    dt1 = full_table(dt1_action)
    dt2 = full_table(dt2_action)

    r1 = show_steps("DT-1", dt1, DT1_MERGE_ORDER)
    r2 = show_steps("DT-2", dt2, DT2_MERGE_ORDER, drop_impossible=True)

    # The step-by-step result must be the reduced table in the report.
    if sorted(r1) != sorted(DT1_REDUCED):
        sys.exit("DT-1: merge steps do not end in the reduced table of the report")
    if sorted(r2) != sorted(r for r in DT2_REDUCED if r[1] != IMPOSSIBLE):
        sys.exit("DT-2: merge steps do not end in the reduced table of the report")

    check_reduced("DT-1", dt1, DT1_REDUCED)
    check_reduced("DT-2", dt2, DT2_REDUCED)
    print("OK: both reduced tables match the full tables for all 32 rules.")

    if "--markdown" in sys.argv:
        print("\n" + markdown(dt1, DT1_CONDITIONS))
        print("\n" + markdown(dt2, DT2_CONDITIONS))


if __name__ == "__main__":
    main()
