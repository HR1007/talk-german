import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Account from './pages/Account'
import Cards from './pages/Cards'
import Daily from './pages/Daily'
import Done from './pages/Done'
import GrammarPage from './pages/Grammar'
import Landing from './pages/Landing'
import LibraryPage from './pages/Library'
import Quiz from './pages/Quiz'
import Translate from './pages/Translate'

// HashRouter：GitHub Pages 沒有伺服器端路由，重新整理 /daily 會 404，用 #/daily 就不會
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<Layout />}>
          <Route path="/translate" element={<Translate />} />
          <Route path="/daily" element={<Daily />} />
          <Route path="/daily/cards" element={<Cards />} />
          <Route path="/daily/grammar" element={<GrammarPage />} />
          <Route path="/daily/done" element={<Done />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/account" element={<Account />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
