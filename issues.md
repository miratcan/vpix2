# VPix — Issues & Backlog

This backlog splits the MANIFEST-driven roadmap into discrete issues with priority, scope, and acceptance criteria.

Legend priority: P0 (now), P1 (next), P2 (later)

---

## P0 — :tutorial 60s (Guided Onboarding)
- Rationale: “Anında Tatmin” + “Keşfedilebilir Arayüz”
- Scope:
  - Add `:tutorial 60s` command that prints 6–8 short steps (move, paint, visual select, y/d/p, share).
  - Allow `exit`/`clear` to quit early; do not block normal actions.
  - Keep purely in terminal (no modals).
- Acceptance:
  - Running `:tutorial 60s` prints steps with clear, numbered hints.
  - User can complete or exit; no state corruption.
  - Docs: `:help tutorial` lists usage.
- Notes: minimal state (simple step index stored in memory).

## P0 — Snapshots: `:snapshot save/restore/list`
- Rationale: “Yaratıcı Güvenlik” (git‑like)
- Scope:
  - Commands: `:snapshot save <name>`, `:snapshot restore <name>`, `:snapshot list`.
  - Store snapshots in memory; optional `:snapshot persist on/off` writes to localStorage.
- Acceptance:
  - Restoring a snapshot restores size, palette, color index, and grid.
  - List shows saved names; persist flag survives reload when enabled.

## P0 — vp2r Meta Versioning
- Rationale: “Taşınabilir Motor” + “Dijital Parmak İzi”
- Scope:
  - Append `;av<app>;ev<engine>` to vp2r payload.
  - On decode, if present and mismatched, print a non-blocking warning in terminal.
- Acceptance:
  - `:link` updates URL with meta.
  - Loading a link with mismatched meta shows a warning line once.

---

## P1 — Replay: `:replay [speed=<x>] [loop]`
- Rationale: “Performans Olarak Çizim” + “Yaratıcının Hikâyesi”
- Scope:
  - Record command log (terminal commands + derived engine actions where useful).
  - `:replay` replays with timing; `speed` scales timings; `loop` repeats.
- Acceptance:
  - Replay runs visibly (cursor/selection updates); can be cancelled by `exit`.
  - Docs: `:help replay`.
- Dependency: basic command log buffer.

## P1 — Export: Copy PNG (+link)
- Rationale: “Sürtünmesiz Paylaşım”
- Scope:
  - `:export png` → copy PNG to clipboard (if supported) or provide download.
  - `:export png+link` → PNG plus link (as separate text fallback).
- Acceptance:
  - Works on modern browsers (with secure context); degrades gracefully.

## P1 — Link Paste‑to‑Open
- Rationale: “Sürtünmesiz Paylaşım”
- Scope:
  - Detect a pasted `vp2`/`vp2r` payload in terminal input and decode.
- Acceptance:
  - Pasting a full share URL or just `vp2r;...` loads the canvas; prints a success message.

---

## P1 — LocalStorage Files: `w/ls/rm` + per‑file snapshots
- Rationale: “Dosya Odaklı Akış” + “Kalıcı Depolama”
- Scope:
  - `w <filename>` saves current project to localStorage (default `.vpix2` if missing).
  - `ls` lists saved files; optionally `ls <pattern>` filters.
  - `rm <filename>` deletes a saved file (non‑blocking; optional confirm).
  - Saved files embed current state (size, palette, color index, grid) and any number of snapshots.
  - Snapshots are keyed by name and names are unique per file.
  - `:snapshots <filename>` lists all snapshot names embedded in the file.
- Acceptance:
  - `w` creates/overwrites an entry; `ls` shows filenames; `rm` removes the entry.
  - Filenames are unique keys; operations are reflected immediately without app reload.
  - `:snapshots <filename>` prints an empty state when no snapshots exist; after saving two different snapshots, listing shows both.
- Notes:
  - LocalStorage namespace: `vpix/files/<filename>`; payload may extend existing vp2r with a file wrapper if needed.

---

## P2 — Slug Autocomplete: LoSpec Fallback
- Rationale: “Keşfedilebilir Arayüz”
- Scope:
  - If local registry has no match for `slug`, query LoSpec and add suggestions.
  - Consider async suggest API in param types or hybrid in App.
- Acceptance:
  - Tab completion suggests remote slugs after a short delay; behaves non-blocking.

## P2 — Help Topics Expansion
- Rationale: Better discoverability
- Scope: `:help basics|colors|share|advanced` curated outputs.
- Acceptance: Topic-based help pages exist and link to each other.

---

# Ordering Summary
- P0: tutorial, snapshots, vp2r meta
- P1: replay, export PNG(+link), paste‑to‑open, localStorage files (w/ls/rm + per‑file snapshots)
- P2: slug async suggest, help topics expansion
