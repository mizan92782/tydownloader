import { NavLink } from 'react-router-dom'
import { Download, Home, PlayCircle } from 'lucide-react'
import styles from './Layout.module.css'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <PlayCircle size={22} />
            </div>
            <span className={styles.logoText}>YT<span className={styles.logoAccent}>Downloader</span></span>
          </div>
          <nav className={styles.nav}>
            <NavLink
              to="/"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
              id="nav-home"
            >
              <Home size={16} />
              <span>Home</span>
            </NavLink>
            <NavLink
              to="/downloads"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
              id="nav-downloads"
            >
              <Download size={16} />
              <span>Downloads</span>
            </NavLink>
          </nav>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <p>Built with ♥ using FastAPI + React</p>
      </footer>
    </div>
  )
}
