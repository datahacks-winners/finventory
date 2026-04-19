import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Marketplace from './pages/Marketplace'
import CrateDetail from './pages/CrateDetail'
import SupplierPortal from './pages/SupplierPortal'
import Impact from './pages/Impact'
import About from './pages/About'
import Auth from './pages/Auth'

function AppRoutes() {
  const { pathname } = useLocation()
  const isAuth = pathname === '/auth'

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen">
      {!isAuth && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/marketplace/:id" element={<CrateDetail />} />
        <Route path="/suppliers" element={<SupplierPortal />} />
        <Route path="/impact" element={<Impact />} />
        <Route path="/about" element={<About />} />
        <Route path="/auth" element={<Auth />} />
      </Routes>
      {!isAuth && <Footer />}
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
