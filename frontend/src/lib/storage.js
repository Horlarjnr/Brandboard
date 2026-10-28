// Projects are remembered in this browser only. Losing the owner token means
// losing access to the project (there are no accounts).
const KEY = 'brandboard.projects.v1'

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* storage unavailable: app still works for this session */
  }
}

export function listSavedProjects() {
  return read()
}

// color = the brand's primary color, used for the sidebar avatar.
export function saveProject({ code, token, name, color }) {
  const list = read().filter((p) => p.code !== code)
  list.unshift({ code, token, name, color })
  write(list)
  return list
}

export function getToken(code) {
  return read().find((p) => p.code === code)?.token ?? null
}

export function removeProject(code) {
  const list = read().filter((p) => p.code !== code)
  write(list)
  return list
}
