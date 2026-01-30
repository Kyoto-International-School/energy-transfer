# Energy Transfer Diagram Editor

A client-side React app for building energy transfer diagrams with drag-and-drop components and labeled transfers. Built with Vite, React, TypeScript, React Flow (@xyflow/react), and Tailwind CSS. Runs entirely in the browser and saves work to localStorage.

## Features

- Drag-and-drop components: Container, Store, External.
- Stores live inside containers (drag in or use "Add a store").
- Connect nodes with labeled transfer edges; click labels or use the Inspector.
- Inspector panel for editing labels, store types, transfer types, and deletion.
- Mini map (click or tap to toggle size) plus React Flow controls.
- Export canvas to PNG (uses the name from Settings).
- Touch-friendly interactions and pointer-event drag-and-drop.
- Automatic persistence of diagrams and UI settings in localStorage.

## Usage

- Drag a component from the left sidebar onto the canvas. Stores must be dropped into a container.
- Click a node or edge to edit details in the Inspector.
- Double-click or double-tap container/external labels to edit.
- Click an edge label to choose a transfer type.
- Use the toolbar to export, open settings, or clear the canvas.
- The editor is designed for iPad-sized screens or larger.

## Local development

Prereqs: Node 20+ (CI uses Node 20).

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run check
```

This runs lint, typecheck, and knip.

## Production build

```bash
npm run build
npm run preview
```

## GitHub Pages deployment

- Workflow: `.github/workflows/deploy.yml`
- Vite base path: `base: "/energy-transfer/"` in `vite.config.js`
- On pushes to `main`, the workflow builds and deploys `dist` to GitHub Pages.

## Changing the repo name / base path

If the repo name changes, update:

- `vite.config.js` -> `base: "/<new-repo-name>/"`
- Any documentation or links that reference the Pages URL

## Customization

- Store types and transfer labels: `src/types.ts`
- Initial diagram: `src/App.tsx` (`initialNodes` / `initialEdges`)
- localStorage keys: `src/storage.ts` and `src/settings.ts`
