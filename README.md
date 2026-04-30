# VPix

A keyboard-driven pixel art editor that works like Vim. No menus, no toolbars — just keys.

**[Try it in your browser](https://mirat.dev/vpix2/)**

## How it works

If you know Vim, you know VPix:

- `h j k l` to move the cursor
- `i` to enter insert (paint) mode, `Esc` to go back to normal
- `Space` to paint, `x` to erase
- `v` for visual selection, `d` to delete, `y` to yank, `p` to paste
- `u` to undo, `Ctrl+r` to redo
- `Tab` to switch cursor axis (horizontal/vertical)
- `:` to open the command terminal

## Drawing tools

- **Line:** `Shift+l` then move and confirm
- **Rectangle:** `Shift+r` for outlined, fill-rect for filled
- **Circle:** `Shift+c`
- **Flood fill:** `Shift+f`
- **Color pick:** `Shift+p` from canvas

## Commands

Type `:` to open the terminal:

```
:palette use pico-8          # switch to pico-8 palette
:palette search              # browse LoSpec palettes
:resize 32 32                # resize canvas
:export png                  # export as PNG
:help                        # full command list
```

## Sharing

Every drawing is encoded in the URL. Copy the link and anyone can see and edit your pixel art. No accounts, no uploads.

## Tech stack

- React + Vite + TypeScript
- Canvas API with dirty-rect rendering
- Pure JS engine (no framework dependency in core)
- LoSpec palette integration
- URL-encoded shareable format (vp2r)

## Development

```bash
npm install
npm run dev          # start dev server
npm test             # run tests
npm run build        # production build
```

## License

MIT
