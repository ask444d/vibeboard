// Минимальные типы File System Access — без any по всему коду
export interface FSFileHandleLike {
  kind: 'file'
  name: string
  getFile(): Promise<{ size: number; text(): Promise<string> }>
}
export interface FSDirHandleLike {
  kind: 'directory'
  name: string
  values(): AsyncIterableIterator<FSFileHandleLike | FSDirHandleLike>
  getDirectoryHandle(name: string): Promise<FSDirHandleLike>
  getFileHandle(name: string): Promise<FSFileHandleLike>
  queryPermission?(opts?: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
}
export type FileSystemDirectoryHandleLike = FSDirHandleLike
export type FileSystemHandleLike = FSFileHandleLike | FSDirHandleLike
