// Tauri/Node-only git log через isomorphic-git.
// Этот модуль НЕ импортируется браузерным кодом — только Tauri entry,
// поэтому isomorphic-git не попадает в веб-бандл.
import type { GitCommit } from './git'

interface GitLogEntry { oid: string; commit: { author: { name: string; timestamp: number }; message: string } }

export async function gitLogNode(dir: string, depth = 20): Promise<GitCommit[]> {
  try {
    if (!/^(\/|~\/|[A-Za-z]:\\)/.test(dir)) return []
    const gitMod = await import('isomorphic-git') as unknown as { log: (opts: Record<string, unknown>) => Promise<GitLogEntry[]> }
    const fsMod = await import('node:fs') as unknown as { promises: unknown }
    const safeDepth = Math.min(50, Math.max(1, depth))
    const logs = await gitMod.log({ fs: fsMod.promises, dir, depth: safeDepth })
    return logs.map((l) => ({
      oid: l.oid.slice(0, 7),
      author: String(l.commit.author.name).slice(0, 60),
      message: String(l.commit.message).split('\n')[0].slice(0, 200),
      timestamp: l.commit.author.timestamp * 1000,
    }))
  } catch { return [] }
}
