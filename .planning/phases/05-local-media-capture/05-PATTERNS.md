# Phase 5 — Pattern map

**Phase:** 05-local-media-capture  
**Created:** 2026-04-15

## Analog: hooks

| New | Analog | Pattern |
|-----|--------|---------|
| `use-media-capture.ts` | `src/client/hooks/use-events-poll.ts` | `useState` + `useRef` + `useCallback` + `useEffect` cleanup; read env via small lib modules |

## Analog: UI + errors

| New | Analog | Pattern |
|-----|--------|---------|
| Media capture section | `src/client/events-screen.tsx` (`events-error`, `events-empty`, `events-panel`) | Conditional blocks; `role="alert"` for errors; `events-btn` for actions |
| Styles | `src/client/styles.css` | CSS variables `--color-*`, `--space-*`; panel + list spacing |

## Analog: tests

| New | Analog | Pattern |
|-----|--------|---------|
| Hook / component tests | `src/client/lib/new-events.test.ts`, `src/client/api/events-client.test.ts` | `bun:test`, `describe`/`test`, mock `fetch` or globals |

## Data flow (Phase 5)

```
User click → getUserMedia → MediaStream → (mic) AnalyserNode → level state
                          → (camera) <video srcObject>
Errors → inline alert (no fetch)
```

---

## PATTERN MAPPING COMPLETE
