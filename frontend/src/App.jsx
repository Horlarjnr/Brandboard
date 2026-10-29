import { Routes, Route } from 'react-router-dom'
import AppShell from './components/AppShell.jsx'
import Landing from './pages/Landing.jsx'
import Workspace from './pages/Workspace.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Landing />} />
        <Route path="project/:code" element={<Workspace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
