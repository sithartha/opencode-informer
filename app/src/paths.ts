/** The final segment of a working-directory path (handles POSIX and Windows). */
export function dirName(cwd: string): string {
  if (!cwd) return ""
  const trimmed = cwd.replace(/[\\/]+$/, "")
  if (!trimmed) return "/"
  const parts = trimmed.split(/[\\/]/)
  return parts[parts.length - 1] || trimmed
}
