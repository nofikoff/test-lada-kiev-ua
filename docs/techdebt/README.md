# Tech-debt registry

Debt the team must know about. Private, pre-promotion notes live in `docs/_local/` (gitignored).

**No status field.** The file is here — it is open; closed — it is deleted. A status that has to be
maintained separately drifts from reality within the first week, and the directory stops being an
honest snapshot of what is open now.

Two forms, both legitimate:

- **Per-item:** `YYYY-MM-DD-<slug>.md` from `techdebt-template.md`. Closed by `git rm` — audit via
  `git log docs/techdebt/`.
- **Per-context living log:** `YYYY-MM-DD-<context>.md` with `## Open` / `## Closed` sections, new
  items on top. An item closes by **moving to `## Closed`** within the same file. The log as a whole
  is never `git rm`-ed.

An entry whose paths no longer exist is worse than none: it sends the next agent to a file that is
not there. A slice renamed or split — fix the paths in the entry. The filename is not changed for
the sake of sharper wording; a rename is justified only when the subject of the debt itself changes,
and then it is `git mv`, so history stays.

## Per-item

<!-- - [<debt title>](YYYY-MM-DD-<slug>.md) -->

## Per-context logs

<!-- - [<context> — <what the log is about>](YYYY-MM-DD-<context>.md) -->
