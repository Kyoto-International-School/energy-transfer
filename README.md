# Energy Transfer Diagram Editor

Goal (MVP):

- Layout with 3 columns:
  1. Left: “Component Library” list of draggable items
     - Container
     - Store
  2. Middle: React Flow canvas
  3. Right: Inspector panel that shows selected node info (id, type, label). Editable label.
- Drag from the library onto the canvas to create a new node at the drop position.
- Allow moving nodes around within the canvas (standard React Flow behavior).
- Allow connecting nodes with edges (standard React Flow behavior).
- Keep everything client-side; no server.

Technical requirements:

- Use Vite + React + TypeScript.
- Use React Flow for the canvas.
- Use Pointer Events for drag-and-drop in React Flow’s “drag from sidebar to canvas” pattern. See `wiki/react-flow-reference/drag-and-drop-example.md` for guidance.
- Persist nodes/edges/viewport to localStorage and restore on reload.
- Use React Flow-recommended styling.

GitHub Pages deployment requirements:

- Configure Vite `base` correctly for GitHub Pages project hosting at `https://kyoto-international-school.github.io/energy-transfer/`.
- Provide a GitHub Actions workflow that builds and deploys to GitHub Pages.
- Ensure asset paths work when hosted under the repo subpath.
- If routing is introduced, prefer hash routing to avoid refresh 404s; otherwise keep it single-page.

Deliverables:

- Full source structure (all relevant files) including:
  - package.json
  - vite.config.(ts|js) with correct `base`
  - src/main.(tsx|ts)
  - src/App.(tsx|ts)
  - React Flow editor components (canvas + sidebar + inspector)
  - localStorage persistence utilities
  - GitHub Actions workflow under .github/workflows/deploy.yml
  - README.md with:
    - local dev instructions
    - deploy instructions
    - notes on where to change repo name / base path

Implementation notes:

- Use React Flow’s recommended approach for converting screen coordinates to flow coordinates when dropping a node.
- Keep node data shape explicit (e.g., data: { label: string, type: 'text' | 'image' | ... }).
- Make the example minimal but complete and runnable.

Start by outputting the file tree, then each file’s full contents.

---

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```

## Production build

```bash
npm run build
npm run preview
```

## GitHub Pages deployment

- The GitHub Actions workflow lives at `.github/workflows/deploy.yml`.
- It builds the site and publishes the `dist` folder to GitHub Pages on pushes to `main`.
- The Vite `base` is set to `/energy-transfer/` in `vite.config.js` to match the repo subpath.

## Changing repo name / base path

If the repo name changes, update:

- `vite.config.js` → `base: "/<new-repo-name>/"`
- Any documentation or links that reference the Pages URL
