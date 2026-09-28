# VibeBoard data and state diagrams

This document summarizes the real data model used by the app based on `src/lib/types.ts`, `src/store/useStore.ts`, and the persistence layer.

## 1) Core data model (ER diagram)

```mermaid
erDiagram
  PROJECT ||--o{ TASK : contains
  PROJECT ||--o{ IDEA : owns
  PROJECT ||--o{ NOTE : owns
  PROJECT ||--o{ SESSION : tracks
  PROJECT ||--o{ ACTIVITY : records
  PROJECT ||--o{ PROJECT_LANGUAGE : analyzes

  PROJECT {
    string id
    string code
    string name
    string description
    enum type
    enum status
    string local_path
    number progress
    string created_at
    string updated_at
    string git_repository
    string default_branch
    string last_commit
    string branch
    number commits_this_week
    number changes_modified
    number changes_untracked
  }

  PROJECT_LANGUAGE {
    string id
    string project_id
    string language
    number percentage
    number bytes
  }

  TASK {
    string id
    string project_id
    number number
    string title
    string description
    enum status
    enum priority
    string created_at
    string updated_at
    string completed_at
  }

  IDEA {
    string id
    string project_id
    string title
    string description
    string created_at
    string converted_to_task
    enum status
    number votes
    string[] tags
    enum effort
    enum priority
  }

  NOTE {
    string id
    string project_id
    string content
    string created_at
    string updated_at
  }

  SESSION {
    string id
    string project_id
    string goal
    string summary
    string started_at
    string ended_at
    string[] tasks_completed
    string notes
    boolean is_paused
    number paused_ms
    string paused_at
  }

  ACTIVITY {
    string id
    string project_id
    enum type
    string description
    string created_at
  }
```

### Notes on the model

- `Project` is the primary entity and owns most of the domain content.
- `Task` is project-scoped and numbered within a project (`number` starts at 1, computed in `useStore.addTask`).
- `Idea` can be converted into a `Task` via `convertIdeaToTask` or `bulkConvertIdeas`.
- `Session` tracks working time, notes, and tasks completed during a run.
- `Activity` is an append-only event log for UI history and project timeline.
- `ProjectLanguage` is a derived result of file-byte analysis; this is not a separate table in the DB, but a nested array in `Project.languages`.

## 2) Actual app state in Zustand

The app stores the main domain as one persisted root state object, not as separate database tables.

```mermaid
flowchart LR
  A[Zustand store] --> B[projects: Project[]]
  A --> C[tasks: Task[]]
  A --> D[ideas: Idea[]]
  A --> E[notes: Note[]]
  A --> F[sessions: Session[]]
  A --> G[activities: Activity[]]
  A --> H[folder, locale, filters]

  I[persist middleware] --> J[localStorage: vibeboard-store]
  A --> I
```

### Persisted fields

`src/store/useStore.ts` persists:

- `projects`
- `tasks`
- `ideas`
- `notes`
- `sessions`
- `activities`
- `folder`
- `hasOnboarded`
- `locale`
- filter state

The store uses versioning (`version: 5`) and `migrate` to clean legacy fields and keep compatibility.

## 3) State machine for tasks

This reflects the real transitions implemented in `updateTask`, `addTask`, and conversions from ideas.

```mermaid
stateDiagram-v2
  [*] --> TODO

  TODO --> IN_PROGRESS: start work
  TODO --> BLOCKED: blocker
  TODO --> CANCELLED: cancel

  IN_PROGRESS --> REVIEW: ready for review
  IN_PROGRESS --> DONE: complete
  IN_PROGRESS --> BLOCKED: blocked

  REVIEW --> DONE: approved
  REVIEW --> IN_PROGRESS: continue
  REVIEW --> BLOCKED: blocked

  BLOCKED --> IN_PROGRESS: unblock
  BLOCKED --> CANCELLED: cancel

  DONE --> [*]
  CANCELLED --> [*]
```

### Task business rules from code

- `Task.number` is per-project and auto-generated via `maxNum(...) + 1`.
- `Task.progress` is recalculated from task status distribution for the project.
- If a task is marked `DONE`, the active session auto-links it via `active.tasks_completed`.
- Ideas can be converted to tasks with the same title and project linkage.

## 4) State machine for sessions

This reflects the session lifecycle in `addSession`, `togglePauseSession`, `endSession`, and `appendSessionNote`.

```mermaid
stateDiagram-v2
  [*] --> RUNNING

  RUNNING --> PAUSED: togglePauseSession
  PAUSED --> RUNNING: resume

  RUNNING --> FINISHED: endSession(summary)
  PAUSED --> FINISHED: endSession(summary)

  FINISHED --> [*]
```

### Session semantics in the app

- A session is created with `project_id`, `goal`, `started_at`, and an empty `notes` log.
- `is_paused` and `paused_ms` are tracked while running.
- `tasks_completed` is updated as tasks with status `DONE` are linked to the active session.
- An ended session stores a final `summary` and can be used for manual or agent-driven follow-up.

## 5) Project lifecycle / data flow

```mermaid
flowchart TD
  A[User picks folder / drops project / manual add] --> B[scanDirectoryHandle / readFolderHandle / analyzeLanguages]
  B --> C[detectTechStack + read .vibeboard.json]
  C --> D[addProject / addProjectFromFolder / addProjectFromHandle]
  D --> E[Project created in Zustand store]
  E --> F[Tasks / Ideas / Notes / Sessions / Activities are appended]
  F --> G[Project progress recalculated]
  G --> H[Activity feed updated]
  H --> I[localStorage persist via Zustand]
```

### Important project-flow behaviors

- Real file analysis is preferred: languages are derived from byte-level scan, not guessed by filename alone.
- If a project has a `.vibeboard.json`, it can override `type`, `status`, and `code`.
- Git metadata (`last_commit`, `branch`, `commits_this_week`) is derived from history scanning when available.
- The app deliberately avoids fake `languages`/`tech stack` entries when the scan is unavailable.

## 6) Idea → task conversion flow

```mermaid
flowchart LR
  A[Idea in INBOX / CONSIDERED / PLANNED] --> B{Convert to task?}
  B -->|Yes| C[create Task with next project number]
  C --> D[update Idea.converted_to_task]
  D --> E[recalculate Project progress]
  E --> F[add Activity entry]

  B -->|No| G[Keep in idea backlog]
```

This is implemented in `convertIdeaToTask` and `bulkConvertIdeas`.

## 7) Project health / analysis data flow

```mermaid
flowchart TD
  A[Project + repo + file scan] --> B[get languages]
  A --> C[get technologies]
  A --> D[get git history]
  A --> E[get task progress]
  B --> F[compute health / freshness / git state]
  C --> F
  D --> F
  E --> F
  F --> G[UI: project cards, analytics, GitPanel]
```

This aligns with the README and `src/lib/health.ts` description: project health is derived from multiple signals rather than a single metric.

## 8) Persistence and migration model

```mermaid
stateDiagram-v2
  [*] --> v1
  v1 --> v3: migrate
  v3 --> v4: add idea/session defaults
  v4 --> v5: clean aii_score + selectedProjectCode cleanup
  v5 --> PERSISTED: localStorage

  PERSISTED --> READ: load app
  READ --> UI
```

Notes:

- The real app uses `persist` from Zustand, with `name: 'vibeboard-store'`.
- Version migrations exist to keep old data stable after schema changes.
- The state is intentionally kept in app memory + localStorage for a lightweight local-first architecture.

## 9) Summary

The app’s true data structure is a set of related arrays under one Zustand root store, rather than a relational database. This makes the domain simple and fast for a local-first tool, while still preserving clear relationships:

- one `Project` owns many `Task`, `Idea`, `Note`, `Session`, and `Activity`
- `Task` is the execution unit
- `Idea` is the backlog unit
- `Session` is the time-tracking unit
- `Activity` is the event log
- `Project` includes derived analysis (`languages`, `techs`, `git metadata`, `progress`)

This keeps the architecture understandable while allowing a future migration to IndexedDB/Dexie/SQLite without changing the product model completely.
