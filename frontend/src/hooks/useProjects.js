import { useCallback, useState } from 'react'
import { listSavedProjects, saveProject, removeProject } from '../lib/storage.js'

export default function useProjects() {
  const [projects, setProjects] = useState(() => listSavedProjects())

  const add = useCallback((p) => setProjects(saveProject(p)), [])
  const remove = useCallback((code) => setProjects(removeProject(code)), [])

  return { projects, add, remove }
}
