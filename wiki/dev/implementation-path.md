# Implementation Path

This path keeps the app runnable at each step and avoids large rewrites.

1. Convert to TypeScript + align structure
   - Rename `src/main.jsx` -> `src/main.tsx` and `src/App.jsx` -> `src/App.tsx`.
   - Add explicit types for nodes/edges and React Flow handlers.

2. Build the 3-column layout shell
   - Add sidebar, canvas, and inspector layout in `App.tsx`.
   - Wire basic selection state (no drag-and-drop yet).

3. Add drag-from-sidebar creation (Pointer Events)
   - Follow the React Flow drag-and-drop pattern from
     `wiki/react-flow-reference/drag-and-drop-example.md`.
   - Convert screen coordinates to flow coordinates for drop placement.

4. Implement inspector editing
   - Show selected node info and allow label edits.
   - Sync `data.label` to the selected node in state.

5. Add localStorage persistence
   - Save/restore nodes, edges, and viewport.
   - Handle empty or invalid storage gracefully.

6. GitHub Pages readiness
   - Set `base: "/energy-transfer/"` in `vite.config.js`.
   - Add `.github/workflows/deploy.yml` for Pages deploy.
   - Update README with dev/deploy steps and base path notes.
