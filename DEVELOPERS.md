# Developers Guide

## Overview

VPix is composed of two primary layers:

- **Core engine (`core/`)** – framework-agnostic TypeScript modules that model the canvas state, command system, keybindings, and serialization. This layer has zero React/browser dependencies so it can be unit-tested in isolation and potentially reused in other runtimes.
- **App shell (`src/`)** – React components, hooks, and styles that render the engine inside the browser, handle user interaction, and orchestrate the command feed/terminal.

The repo also ships with end-to-end friendly unit/integration tests under `test/` and React component tests colocated with their source.

## Directory Layout

- `core/engine/` – stateful engine implementation (`index.ts`) plus supporting utilities: grid storage, selection manager, history stack, clipboard, events, etc. The new `core/engine/testable.ts` exports `TestableEngine`, a thin subclass that reads/writes grid state using ASCII snapshots for tests.
- `core/commands/` – command definitions grouped by domain (axis, palette, selection, canvas, etc.). Commands are pure objects with metadata, allowing both CLI-style invocation and keybinding integration.
- `core/services/` – supporting helpers such as `KeymapBuilder`, palette registry service, document repository, share-link encoding, etc.
- `core/keybindings.ts` – declarative table for default key bindings. Each entry specifies scope, command id, optional prefix requirements, and argument builders.
- `src/hooks/useEngine.ts` – central hook that instantiates the engine, builds the runtime keymap (normalized via `KeymapBuilder`), translates DOM keyboard events into commands, and exposes command feed lines.
- `src/` components – UI for palette, canvas grid, terminal, status bar, etc. `App.tsx` wires hooks, key handlers, and layout.
- `test/engine.spec.ts` & `src/__tests__/app.spec.tsx` – high-level engine/UI behavior tests. Helpers in `test/helpers/grid-helpers.ts` wrap `TestableEngine` for string-based setup/assertions.

## Engine Architecture Highlights

- **State** – `VPixEngine` owns grid data (`GridState`), cursor, selection, history, and palette. Public methods expose canvas mutations while recording history operations.
- **Motion system** – word/line/canvas navigation is implemented in `resolveMotion`. Motions can be executed in normal mode and visual mode; the latter now updates the selection rectangle after each motion.
- **Commands** – Each command definition contains an id, handler, optional CLI pattern, and help text. Handlers operate on the engine passed through the command registry.
- **History** – Mutating commands register `HistoryCell`/`HistoryGroup` entries enabling undo/redo.
- **Testing support** – `TestableEngine` provides `setStateFromString`/`getStateAsString` for human-readable fixture setup. Expect helpers compare ASCII snapshots (axis, color index, grid, cursor overlay `C`).

## Key Handling

1. **Definition** – `core/keybindings.ts` lists canonical key assignments (lowercase, e.g., `g`, `shift+g`, `g+shift+t`).
2. **Runtime map** – `useEngine` reads keybinding entries and uses `KeymapBuilder.bind` to register them. All keys are normalized via `KeymapBuilder.normalizeKeySequence` (modifier order + lowercase) so definitions and DOM events align.
3. **Event parsing** – `KeymapBuilder.parseEvent` inspects `KeyboardEvent`, capturing modifiers (`ctrl`, `shift`, `alt`, `meta`) and the key (space => `space`, uppercase letters lowered). Prefix handling is managed in `useEngine` by tracking pending prefixes/counts and retrying lookups.
4. **Visual mode motions** – The visual scope includes `w/b/e`; when axis commands run while in visual mode, `engine.updateSelectionRect()` keeps the selection anchored to the cursor.

## UI Considerations

- `App.tsx` delegates keyboard events to the hook first. If the hook returns `false`, legacy handlers handle zoom, command terminal toggling, etc. Focusable inputs (`<input>`, `<textarea>`, contentEditable) are ignored to prevent stealing characters (e.g., typing `p` inside the terminal).
- Command feed lines are appended via engine change payloads; each executed command may emit tip or result strings that appear in the terminal log.
- `CanvasGrid` reads directly from the engine grid to render pixels and selection overlays; it subscribes to engine revisions via the hook.

## Testing Strategy

- **Engine tests (`test/engine.spec.ts`)** – instantiate `TestableEngine`, set state from text blocks, exercise commands and motions, serialize state for assertions. This replaces hard-to-read matrix literals with ASCII diagrams.
- **App tests (`src/__tests__/app.spec.tsx`)** – render `App`, query the global engine reference, and simulate keyboard sequences; `expectEngineToMatchText` verifies state/cursor overlays against text fixtures.
- **Classic tests** – other suites (`test/tools.spec.ts`, `test/commands.spec.ts`, etc.) validate utility logic, palette service, and command behavior.

Run the full suite with `npx vitest run`. Some tests intentionally log mocked failures to stdout/stderr but still pass (e.g., command history failure scenario).

## Development Tips

- Always use `TestableEngine` for new engine-level tests; include `Axis:` and `Color:` headers plus `C` to mark cursor location. Each cell is written using two-character tokens (`C1`, ` .`).
- When adding new keyboard shortcuts, define them in `core/keybindings.ts`. The runtime hook will pick them up automatically once the app is restarted.
- UI key handlers should return early when events originate from text inputs to avoid interfering with typing in the terminal or other form controls.
- For new commands, prefer adding them to the appropriate `core/commands/*` file with declarative metadata so both terminal and keymap can use them.

