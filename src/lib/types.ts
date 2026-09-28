export type ProjectType = 'WEB' | 'APP' | 'GAME' | 'BOT' | 'AI' | 'TOOL' | 'OTHER'
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'PAUSED' | 'BLOCKED' | 'TESTING' | 'COMPLETED' | 'ARCHIVED'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'BLOCKED' | 'CANCELLED'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type ActivityType = 'created_task' | 'completed_task' | 'status_change' | 'added_idea' | 'added_note' | 'session' | 'git' | 'project_created' | 'project_scanned'

export interface ProjectLanguage {
  id: string
  project_id: string
  language: string
  percentage: number
  bytes: number
}

export interface Project {
  id: string
  code: string
  name: string
  description: string
  type: ProjectType
  status: ProjectStatus
  local_path: string
  progress: number
  created_at: string
  updated_at: string
  // auto
  git_repository?: string
  default_branch?: string
  last_commit?: string
  languages: ProjectLanguage[]
  technologies: string[]
  // git stats
  branch?: string
  commits_this_week?: number
  changes_modified?: number
  changes_untracked?: number
}

export interface Task {
  id: string
  project_id: string
  number: number
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  created_at: string
  updated_at: string
  completed_at?: string
}

export type IdeaStatus = 'INBOX' | 'CONSIDERED' | 'PLANNED' | 'DROPPED'
export type IdeaEffort = 'XS' | 'S' | 'M' | 'L' | 'XL'

export interface Idea {
  id: string
  project_id: string
  title: string
  description?: string
  created_at: string
  converted_to_task?: string
  status: IdeaStatus
  votes: number
  tags: string[]
  effort?: IdeaEffort
  priority?: TaskPriority
}

export interface Note {
  id: string
  project_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  project_id: string
  goal: string
  summary?: string
  started_at: string
  ended_at?: string
  tasks_completed: string[]
  notes: string // live log
  is_paused?: boolean
  paused_ms?: number
  paused_at?: string
}

export interface Activity {
  id: string
  project_id: string
  type: ActivityType
  description: string
  created_at: string
}

export interface ProjectsFolder {
  name: string
  path: string
}
