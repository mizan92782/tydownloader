import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import DownloadsPage from './pages/DownloadsPage'
import DownloadDetailPage from './pages/DownloadDetailPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/downloads" element={<DownloadsPage />} />
        <Route path="/downloads/:id" element={<DownloadDetailPage />} />
      </Routes>
    </Layout>
  )
}
