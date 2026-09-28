# VibeBoard — персональный трекер для vibe coding

![CI](https://github.com/you/vibeboard/actions/workflows/ci.yml/badge.svg) ![VibeBoard](https://img.shields.io/badge/VibeBoard-local--first-violet) ![Vite](https://img.shields.io/badge/Vite-React--TS-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen) ![i18n](https://img.shields.io/badge/i18n-en%20%7C%20ru-blue)

**VibeBoard** — личный command center для всех твоих проектов. Выбери одну папку `~/Projects`, и VibeBoard автоматически обнаружит проекты, свяжет их с локальными путями, покажет стек, языки (GitHub-style bar), git-инфо, прогресс, задачи, идеи, заметки, сессии и активность.

> Не Jira. Легкий, быстрый, local-first. Apple + Linear эстетика.
> Open source — см. `CONTRIBUTING.md`, `ROADMAP.md`, `docs/ARCHITECTURE.md`.

**Demo:** `https://vibeboard.vercel.app` (заглушка) · **Discord:** `https://discord.gg/vibeboard` · **Sponsors:** `GitHub Sponsors`

---

## ✨ MVP фичи (всё реализовано)

**Projects**
- Выбор общей папки проектов через File System Access API (+ fallback demo)
- Авто-обнаружение по `.git / package.json / pubspec.yaml / Cargo.toml / requirements.txt / go.mod` …
- `WEB-001 / APP-001 / GAME-001 / BOT-001 / AI-001 / TOOL-001 / OTHER-001` — автогенерация кодов
- Статусы: `PLANNING · ACTIVE · PAUSED · BLOCKED · TESTING · COMPLETED · ARCHIVED`
- `local_path` + действия: Copy path / Open in VS Code / Open folder / Terminal (browser-aware)

**Project analysis**
- Git detection + branch / last commit / changes / commits/week
- Языки: анализ по размеру в байтах (игнор `node_modules/.git/dist/build/vendor` + бинарники + ассеты)
- GitHub-style language bar (стабильные цвета, компакт + полный)
- Tech stack детект по `package.json` / `pubspec.yaml` / `Cargo.toml` … + ручное редактирование (через детект)

**Tasks**
- `#001` нумерация внутри проекта, `project_id` связь, статусы `TODO / IN_PROGRESS / REVIEW / DONE / BLOCKED / CANCELLED`, приоритеты
- Автоматический прогресс `done / total`
- Next Action — самая важная следующая задача (IN_PROGRESS > REVIEW > TODO)

**Organization**
- Ideas (💡, конверт в Task)
- Notes (edit/delete)
- Sessions (goal → started/ended → summary)
- Activity timeline (группировка Today/Yesterday)

**UI**
- Sidebar (desktop) + bottom nav (mobile), Overview / Projects / Tasks / Ideas / Sessions / Activity / Settings
- Dashboard с карточками (language bar + прогресс + Next)
- Project page с табами overview/tasks/ideas/notes/sessions/activity
- Global search `⌘K` по проектам/задачам/идеям/заметкам
- Фильтры по статусам проектов и задач
- Dark / Light (persist), responsive, glass/blur, smooth transitions
- Local-first: `zustand + persist (localStorage)` — легко заменить на IndexedDB/Dexie, архитектура готова к desktop (Tauri)

---

## 🗂 Структура

```
src/
  lib/
    types.ts      — Project/Task/Idea/Note/Session/Activity
    constants.ts  — цвета языков, игнор-директории, детекторы
    utils.ts      — коды, прогресс, analyzeLanguages, detectTechStack, FS API
    seed.ts       — демо VibeBoard / MedRef / VELMARA / TelegramBot / AI-Assistant / SomeWebsite
  store/
    useStore.ts   — zustand + persist, вся логика
  components/
    ui/           — LanguageBar, Progress, Badge
    layout/       — Sidebar, Topbar, Layout
    ProjectCard.tsx
  pages/
    Onboarding.tsx  — Select folder + scan
    Overview.tsx
    Projects.tsx
    ProjectPage.tsx — 6 табов
    TasksPage.tsx
    IdeasPage.tsx
    SessionsPage.tsx
    ActivityPage.tsx
    SettingsPage.tsx
```

---

## 🚀 Запуск

```bash
cd VibeBoard
npm install
npm run dev           # http://localhost:5173
npm run build         # production
npm run preview
```

Требуется Node 18+.

### File System Access API
- Работает в Chrome/Edge/Arc/Brave (`showDirectoryPicker`).
- В Safari/Firefox — fallback: демо-структура + ручное добавление.

---

## 🎨 Дизайн-система

- **Шрифты:** Inter + JetBrains Mono
- **Цвета языков:** стабильный маппинг (TypeScript `#3178c6`, Dart `#00B4AB`, C# `#178600` …)
- **Статусы:** точка + иконка (`🟢 Active` …)
- **Карточки:** `rounded-2xl`, `border`, `card-hover` (translate + shadow)
- **Полоски:** `linear-gradient(90deg, #7c3aed, #4f46e5, #06b6d4)` для progress
- **Темы:** CSS variables `hsl(var(--bg))`, `.dark` toggle, `localStorage: vb-theme`

---

## 📦 Хранение

Сейчас: `localStorage` через `zustand/persist` (`vibeboard-store`). 
Легко мигрировать на `Dexie (IndexedDB)` без изменения API — типы уже совместимы с таблицами `projects / project_languages / project_technologies / tasks / ideas / notes / sessions / activities`.
Handle папки можно хранить в IndexedDB (`idb-keyval`) для персиста разрешений.

---

## ◉✦ Интеграция с агентами (OpenCode / Claude Code)

Завершённую сессию можно отправить агенту одной кнопкой (◉/✦ под саммари).
Саммари собирается локально из данных сессии, никуда в облако не уходит.

**OpenCode — ничего ставить не надо**, у него встроенный HTTP-сервер:
```bash
opencode serve --port 4096 --cors http://localhost:5173
curl localhost:4096/global/health   # {"healthy":true}
```
Вставь `http://localhost:4096` в Настройки → Интеграции → OpenCode hook —
VibeBoard сам создаст сессию (`POST /session`) и положит саммари первым
сообщением (`POST /session/:id/message`). Без пароля на сервере
(basic auth не поддерживается).

**Claude Code** HTTP не принимает, поэтому в репозитории лежит relay
(`scripts/vibeboard-agent-relay.mjs`, node, ноль зависимостей):
```bash
node scripts/vibeboard-agent-relay.mjs --port 4100   # → http://127.0.0.1:4100/hook
```
Саммари складываются в `~/VIBEBOARD_INBOX.md`; чтобы Claude подбирал их сам,
добавь SessionStart-хук в `.claude/settings.json` (сниппет — в `--help`
скрипта и в Настройках → «Как получить хук?»). Свой формат? Вставь любой
свой URL — туда уйдёт сырой POST `{sessionId, goal, summary, tasksCompleted}`.

---

## 🔮 Будущее (архитектура готова) — см. `ROADMAP.md`

- ✅ 0.1 MVP — scan + Kanban + i18n + health/weekly + sharing + Tauri фундамент
- ⏳ 0.2 Deep Local — watch + real git log
- ⏳ 0.4 Desktop — SQLite + y-crdt sync
- ⏳ 0.5 Ecosystem — VS Code/Zed extensions + GitHub App

---

## 📝 Лицензия

MIT — делай что хочешь, vibe coding на пользу.

---

**Сделано для vibe coders.** Открой VibeBoard → сразу видишь: где проекты, какой стек, насколько готовы, что делать дальше.
