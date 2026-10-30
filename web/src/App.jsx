import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, CircleUserRound,
  Clock3, Compass, ExternalLink, Filter, MapPin, Menu, Search, ShieldCheck,
  Sparkles, Ticket, Users, X,
} from 'lucide-react'
import { api, formatDate } from './api.js'

const SessionContext = createContext(null)
const categories = ['All events', 'Technology', 'Culture', 'Sports', 'Workshop']
const roleHome = { student: '/dashboard', organiser: '/dashboard', volunteer: '/dashboard', administrator: '/dashboard' }

function useSession() {
  return useContext(SessionContext)
}

function Notice({ tone = 'error', children }) {
  if (!children) return null
  return <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>
}

function Artwork({ category = 'Technology', compact = false, team = false }) {
  const shape = category === 'Culture' ? 'culture' : category === 'Sports' ? 'sports' : category === 'Workshop' ? 'workshop' : 'tech'
  return (
    <div className={`artwork artwork-${shape}${compact ? ' artwork-compact' : ''}${team ? ' artwork-team' : ''}`} aria-hidden="true">
      <span className="artwork-index">CF / 0{shape === 'tech' ? '1' : shape === 'culture' ? '2' : shape === 'sports' ? '3' : '4'}</span>
      <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`field-${shape}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#9b1927" />
            <stop offset="1" stopColor="#170c10" />
          </linearGradient>
          <radialGradient id={`flare-${shape}`} cx="72%" cy="35%" r="62%">
            <stop offset="0" stopColor="#ee6261" stopOpacity=".78" />
            <stop offset="1" stopColor="#150b10" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="640" height="360" fill="#141315" />
        <rect width="640" height="360" fill={`url(#field-${shape})`} opacity=".55" />
        <rect width="640" height="360" fill={`url(#flare-${shape})`} />
        <path d="M385 -35 570 20 526 213 376 296 288 228 326 70Z" fill="none" stroke="#f1d5bc" strokeOpacity=".53" strokeWidth="2" />
        <path d="m385 13 135 38-34 135-112 65-66-51 31-119z" fill="none" stroke="#f1d5bc" strokeOpacity=".28" />
        <path d="M0 278 218 95 384 360H0Z" fill="#090909" fillOpacity=".53" />
        <path d="M447 114 530 201 443 256 376 207Z" fill="#d53e48" fillOpacity=".8" />
        <path d="m434 139 57 60-47 34-48-34z" fill="#171416" stroke="#e9c2a8" strokeOpacity=".64" />
        <path d="M0 322H640" stroke="#eee3d7" strokeOpacity=".25" />
        <path d="M34 0V360M86 0V360M138 0V360" stroke="#eee3d7" strokeOpacity=".06" />
        <circle cx="451" cy="197" r="115" fill="none" stroke="#efb95f" strokeOpacity=".22" strokeDasharray="3 9" />
        {team && (
          <g className="team-elements">
            <path d="m88 97 55 15-24 48 44 14-93 99 23-68-42-13z" fill="#e9c966" stroke="#fff1b1" strokeOpacity=".7" strokeWidth="2" />
            <path d="m216 76 57-28 45 29-20 62-44 24-54-29-12-34z" fill="#a82f39" stroke="#e8c29a" strokeWidth="2" />
            <path d="m216 76 34 37 48-36m-44 86 8-49" fill="none" stroke="#e7b66c" strokeOpacity=".8" strokeWidth="3" />
            <path d="M379 73a82 82 0 0 1 101 14M493 111a82 82 0 0 1 3 98M470 230a82 82 0 0 1-103 10M354 215a82 82 0 0 1 5-118" fill="none" stroke="#93b9db" strokeOpacity=".85" strokeWidth="7" />
            <path d="m423 123 10 23 25 3-18 17 5 25-22-12-21 12 4-25-18-17 25-3z" fill="#c6d9eb" stroke="#eff4fa" strokeWidth="1.5" />
            <path d="M122 280c38-33 83-39 121-11 38-28 81-23 119 11-38 36-81 41-119 12-38 29-83 24-121-12z" fill="#579254" fillOpacity=".87" stroke="#b0d58b" strokeOpacity=".7" strokeWidth="2" />
            <path d="M147 280c31-17 61-16 96 4 35-20 65-21 96-4m-96-11v20" fill="none" stroke="#d4e6a8" strokeOpacity=".8" strokeWidth="2" />
            <text x="69" y="324" fill="#d2c3ad" fontSize="10" letterSpacing="2">STORM</text>
            <text x="225" y="192" fill="#d2c3ad" fontSize="10" letterSpacing="2">FORGE</text>
            <text x="414" y="278" fill="#d2c3ad" fontSize="10" letterSpacing="2">COSMOS</text>
            <text x="172" y="316" fill="#d2c3ad" fontSize="10" letterSpacing="2">FORCE</text>
          </g>
        )}
      </svg>
      <span className="artwork-stamp">CAMPUS / {shape.toUpperCase()}</span>
    </div>
  )
}

export function EventCard({ event }) {
  return (
    <article className="event-card">
      <Link to={`/events/${event._id}`} className="event-card-art" aria-label={`View ${event.title}`}>
        <Artwork category={event.category} compact />
        <span className="event-category">{event.category}</span>
        <span className="event-date">{new Date(event.startAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
      </Link>
      <div className="event-card-copy">
        <div className="event-card-meta"><span><MapPin size={14} />{event.venue}</span><span>Free entry</span></div>
        <h3><Link to={`/events/${event._id}`}>{event.title}</Link></h3>
        <p>{event.description}</p>
        <Link className="text-link" to={`/events/${event._id}`}>Event details <ArrowUpRight size={15} /></Link>
      </div>
    </article>
  )
}

function Header() {
  const { user, setUser } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const navigate = useNavigate()
  const logout = async () => {
    setBusy(true)
    setLogoutError('')
    let succeeded = false
    try {
      await api('/auth/logout', { method: 'POST' })
      setUser(null)
      navigate('/')
      succeeded = true
    } catch (failure) {
      setLogoutError(failure.message)
    } finally {
      setBusy(false)
      if (succeeded) setMenuOpen(false)
    }
  }
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand" aria-label="CampusFest home">
          <span className="brand-mark"><span /></span>
          <span className="brand-name">CAMPUS<span>FEST</span></span>
        </Link>
        <button className="menu-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav className={`main-nav${menuOpen ? ' nav-open' : ''}`} aria-label="Main navigation">
          <Link to="/events" onClick={() => setMenuOpen(false)}>Discover</Link>
          <a href="/#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
          {user ? (
            <div className="nav-account">
              <Link to={roleHome[user.role]} className="account-link" onClick={() => setMenuOpen(false)}><CircleUserRound size={17} /> My space</Link>
              <button type="button" className="nav-signin nav-logout" onClick={logout} disabled={busy}>{busy ? 'Signing out...' : 'Sign out'}</button>
              {logoutError && <span className="nav-error" role="alert">{logoutError}</span>}
            </div>
          ) : <Link to="/login" className="nav-signin" onClick={() => setMenuOpen(false)}>Sign in <ArrowUpRight size={15} /></Link>}
        </nav>
      </div>
    </header>
  )
}

function SectionHeading({ eyebrow, title, copy, link, to = '/events' }) {
  return (
    <div className="section-heading">
      <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{copy && <p className="section-copy">{copy}</p>}</div>
      {link && <Link className="text-link section-action" to={to}>{link}<ArrowRight size={16} /></Link>}
    </div>
  )
}

function LoadingCards() {
  return <div className="event-grid" aria-label="Loading events">{[1, 2, 3].map((item) => <div className="skeleton-card" key={item}><div className="skeleton-art" /><div className="skeleton-line" /><div className="skeleton-line skeleton-short" /></div>)}</div>
}

function HomePage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  useEffect(() => {
    let active = true
    api('/events?limit=3').then(({ events: upcoming }) => { if (active) setEvents(upcoming) }).catch((failure) => { if (active) setError(failure.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const search = (event) => {
    event.preventDefault()
    const term = query.trim()
    navigate(term ? `/events?search=${encodeURIComponent(term)}` : '/events')
  }
  return (
    <>
      <div className="curtain-wrap" aria-hidden="true">
        <div className="curtain curtain-left" />
        <div className="curtain curtain-right" />
        <div className="curtain-logo">
          <span className="brand-mark"><span /></span>
          <span className="brand-name">CAMPUS<span>FEST</span></span>
        </div>
      </div>
      <main>
        <section className="hero-section">
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="eyebrow hero-eyebrow"><span className="eyebrow-rule" />YOUR CAMPUS, IN MOTION</p>
              <h1>Make room<br />for <em>what moves you.</em></h1>
              <p className="hero-description">Find your people, try something new, and make the moments between lectures count.</p>
              <form className="hero-search" onSubmit={search}>
                <Search size={18} />
                <label className="sr-only" htmlFor="hero-search">Search campus events</label>
                <input id="hero-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search events, workshops, fests..." />
                <button type="submit" aria-label="Search events"><ArrowRight size={19} /></button>
              </form>
              <div className="hero-actions"><Link className="button button-primary" to="/events">Explore events <ArrowUpRight size={16} /></Link><a className="button button-quiet" href="#how-it-works">See how it works <ArrowDownRight size={16} /></a></div>
              <div className="hero-proof"><span className="proof-symbol"><Sparkles size={16} /></span><span>Made for campus life.<br /><strong>Built around your next yes.</strong></span></div>
            </div>
            <div className="hero-visual">
              <div className="hero-art-frame"><Artwork team /><div className="hero-image-caption"><span>FOUR FORCES / ONE CAMPUS</span><span>ORIGINAL HERO ART</span></div></div>
              <div className="hero-side-note">A LITTLE LESS SCROLLING.<br /><span>A LOT MORE SHOWING UP.</span></div>
              <div className="hero-orbit"><span className="orbit-dot" /></div>
            </div>
          </div>
          <div className="hero-footer"><span>01 / FIND IT</span><span>02 / SIGN UP</span><span>03 / SHOW UP</span><span className="hero-footer-note">THE GOOD STUFF HAPPENS HERE <ArrowDownRight size={14} /></span></div>
        </section>

        <section className="discovery-strip">
          <div className="discovery-label"><Compass size={17} /><span>Find your kind of thing</span></div>
          <div className="category-pills">{categories.slice(1).map((category, index) => <Link key={category} to={`/events?category=${encodeURIComponent(category)}`}><span>0{index + 1}</span>{category}<ArrowUpRight size={14} /></Link>)}</div>
        </section>

        <section className="section events-section" id="upcoming">
          <SectionHeading eyebrow="ON THE HORIZON" title="Good things are coming up." copy="A few reasons to close your laptop and head somewhere interesting." link="All events" />
          {loading ? <LoadingCards /> : error ? <Notice>{error} Check your API and database setup.</Notice> : events.length ? <div className="event-grid">{events.map((event) => <EventCard event={event} key={event._id} />)}</div> : <div className="empty-state"><CalendarDays size={23} /><strong>Nothing on the calendar just yet.</strong><span>New campus events will appear here when organisers publish them.</span><Link className="text-link" to="/events">Browse all events <ArrowRight size={15} /></Link></div>}
        </section>

        <section className="how-section" id="how-it-works">
          <div className="how-heading"><p className="eyebrow">A BETTER KIND OF CAMPUS CALENDAR</p><h2>Less planning.<br /><em>More being there.</em></h2></div>
          <div className="how-steps">
            <article><span className="step-number">01</span><Compass size={21} /><h3>Find your thing</h3><p>Explore what's happening across campus-talks, workshops, stages and everything in between.</p></article>
            <article><span className="step-number">02</span><Ticket size={21} /><h3>Save your spot</h3><p>Register in a few taps and keep your upcoming plans together in one place.</p></article>
            <article><span className="step-number">03</span><Users size={21} /><h3>Show up together</h3><p>Check in with your pass, meet your people, and make the day your own.</p></article>
          </div>
        </section>
        <section className="organiser-cta"><div><p className="eyebrow">FOR THE PEOPLE WHO MAKE IT HAPPEN</p><h2>Got an idea worth<br />bringing to campus?</h2></div><Link className="button button-light" to="/login">Organise an event <ArrowUpRight size={16} /></Link></section>
      </main>
      <Footer />
    </>
  )
}

function Footer() {
  return <footer className="site-footer"><Link to="/" className="brand"><span className="brand-mark"><span /></span><span className="brand-name">CAMPUS<span>FEST</span></span></Link><p>Good things happen when we show up.</p><div><Link to="/events">Discover events</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div><span className="footer-copy">(c) {new Date().getFullYear()} CampusFest / Built for campus life</span></footer>
}

export function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [events, setEvents] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const sort = searchParams.get('sort') || 'soonest'
  const page = Number(searchParams.get('page') || 1)

  useEffect(() => {
    let active = true
    const parameters = new URLSearchParams({ page: String(page), limit: '9' })
    if (search) parameters.set('search', search)
    if (category) parameters.set('category', category)
    if (from) parameters.set('from', from)
    if (to) parameters.set('to', to)
    if (sort) parameters.set('sort', sort)
    setLoading(true)
    setError('')
    api(`/events?${parameters}`).then((result) => {
      if (!active) return
      setEvents(result.events)
      setPagination(result.pagination)
    }).catch((failure) => { if (active) setError(failure.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, search, category, from, to, sort])

  const updateQuery = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setSearchParams(next)
  }
  return (
    <main className="page-shell">
      <div className="page-heading"><p className="eyebrow">THE CAMPUS CALENDAR</p><h1>Find your <em>next thing.</em></h1><p>Good talks, loud rooms, new skills, and the people you haven't met yet.</p></div>
      <div className="event-toolbar">
        <label className="filter-search"><Search size={17} /><span className="sr-only">Search events</span><input value={search} onChange={(event) => updateQuery('search', event.target.value)} placeholder="Search events or venues" /></label>
        <label className="select-filter"><Filter size={15} /><span className="sr-only">Filter by category</span><select value={category} onChange={(event) => updateQuery('category', event.target.value)}><option value="">All categories</option>{categories.slice(1).map((value) => <option key={value}>{value}</option>)}</select><ChevronDown size={14} /></label>
        <label className="date-filter"><CalendarDays size={14} /><span className="sr-only">Events starting from</span><input aria-label="Events starting from" type="date" value={from} onChange={(event) => updateQuery('from', event.target.value)} /></label>
        <label className="date-filter"><CalendarDays size={14} /><span className="sr-only">Events starting by</span><input aria-label="Events starting by" type="date" value={to} onChange={(event) => updateQuery('to', event.target.value)} /></label>
        <label className="select-filter sort-filter"><span className="sr-only">Sort events</span><select value={sort} onChange={(event) => updateQuery('sort', event.target.value)}><option value="soonest">Soonest</option><option value="latest">Latest</option></select><ChevronDown size={14} /></label>
        <span className="result-count">{pagination.total} events</span>
      </div>
      {loading ? <LoadingCards /> : error ? <Notice>{error}</Notice> : events.length ? <div className="event-grid">{events.map((event) => <EventCard event={event} key={event._id} />)}</div> : <div className="empty-state"><Search size={23} /><strong>No events match those filters.</strong><span>Try a different search or clear a filter to see more.</span><button type="button" className="text-link" onClick={() => setSearchParams({})}>Clear filters <X size={15} /></button></div>}
      {pagination.pages > 1 && <div className="pagination"><button type="button" disabled={page <= 1} onClick={() => updateQuery('page', String(page - 1))}>Previous</button><span>Page {page} of {pagination.pages}</span><button type="button" disabled={page >= pagination.pages} onClick={() => updateQuery('page', String(page + 1))}>Next</button></div>}
      <Footer />
    </main>
  )
}

function EventPage() {
  const { id } = useParams()
  const { user } = useSession()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [registration, setRegistration] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    api(`/events/${id}`).then(({ event: detail }) => { if (active) setEvent(detail) }).catch((failure) => { if (active) setError(failure.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  const register = async () => {
    if (!user) return navigate('/login', { state: { from: `/events/${id}` } })
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const { registration: created } = await api(`/events/${id}/register`, { method: 'POST' })
      setRegistration(created)
      setMessage('You’re in. Your free registration is confirmed.')
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <main className="page-shell"><div className="page-loading">Loading event...</div></main>
  if (error && !event) return <main className="page-shell"><Notice>{error}</Notice><Link className="text-link" to="/events">Back to events <ArrowRight size={15} /></Link></main>
  if (!event) return <Navigate to="/events" replace />
  const seats = Math.max(0, event.capacity - event.registeredCount)
  return (
    <main className="page-shell event-detail-shell">
      <Link className="back-link" to="/events">Back to events</Link>
      <div className="detail-art"><Artwork category={event.category} /><span className="event-category">{event.category}</span></div>
      <div className="detail-layout">
        <article className="detail-copy">
          <p className="eyebrow">CAMPUSFEST / EVENT {event._id.slice(-6).toUpperCase()}</p>
          <h1>{event.title}</h1>
          <p className="detail-description">{event.description}</p>
          <div className="detail-facts"><span><CalendarDays size={17} />{formatDate(event.startAt)}</span><span><Clock3 size={17} />Until {formatDate(event.endAt)}</span><span><MapPin size={17} />{event.venue}</span></div>
          {event.eligibility && <div className="detail-note"><h3>Who can join</h3><p>{event.eligibility}</p></div>}
          {event.rules && <div className="detail-note"><h3>Good to know</h3><p>{event.rules}</p></div>}
          <div className="detail-note"><h3>Registration closes</h3><p>{formatDate(event.registrationDeadline)}</p></div>
        </article>
        <aside className="registration-panel">
          <p className="eyebrow">SAVE YOUR PLACE</p><div className="price">Free<span>No registration fee</span></div>
          <div className="seats-line"><span><Users size={15} />{seats} places left</span><span>{event.capacity} total</span></div>
          <div className="capacity-track"><span style={{ width: `${Math.min(100, event.registeredCount / event.capacity * 100)}%` }} /></div>
          <button type="button" className="button button-primary button-wide" onClick={register} disabled={busy || seats === 0 || registration?.status === 'confirmed'}>
            {busy ? 'Working...' : registration?.status === 'confirmed' ? 'Registration confirmed' : seats === 0 ? 'Fully booked' : 'Register for free'}
            {!busy && registration?.status !== 'confirmed' && seats > 0 && <ArrowRight size={17} />}
          </button>
          <p className="secure-note"><ShieldCheck size={15} />Your place is confirmed after registration.</p>
          <Notice tone="success">{message}</Notice><Notice>{error}</Notice>
          {registration?.attendanceToken && <AttendancePass token={registration.attendanceToken} />}
          <span className="organiser-note">Organised by {event.organiser?.name || 'Campus organiser'}</span>
        </aside>
      </div>
      <Footer />
    </main>
  )
}

function AttendancePass({ token }) {
  const [qr, setQr] = useState('')
  const [showCode, setShowCode] = useState(false)
  useEffect(() => {
    let active = true
    import('qrcode').then(({ default: QRCode }) => QRCode.toDataURL(token, { width: 220, margin: 1, color: { dark: '#151314', light: '#ffffff' } })).then((value) => { if (active) setQr(value) }).catch(() => { if (active) setQr('') })
    return () => { active = false }
  }, [token])
  return <div className="pass-card"><strong><Ticket size={17} /> Your check-in pass</strong>{qr ? <img src={qr} alt="Private event attendance QR pass" /> : <code>{token}</code>}<span>Keep this pass private. It is valid for event check-in only.</span><button type="button" className="pass-code-toggle" onClick={() => setShowCode(!showCode)}>{showCode ? 'Hide manual code' : 'Show manual check-in code'}</button>{showCode && <code className="pass-code">{token}</code>}</div>
}

function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const { setUser } = useSession()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', yearOfStudy: '', role: 'student' })
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { user } = await api(`/auth/${isRegister ? 'register' : 'login'}`, { method: 'POST', body: form })
      setUser(user)
      const next = window.history.state?.usr?.from
      navigate(next || roleHome[user.role], { replace: true })
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="auth-page">
      <div className="auth-art"><Artwork team /><div className="auth-art-copy"><span>MAKE THE MOST OF</span><strong>YOUR<br />CAMPUS<br /><em>YEARS.</em></strong></div></div>
      <div className="auth-form-wrap"><Link to="/" className="back-link">Back to CampusFest</Link><p className="eyebrow">{isRegister ? 'YOUR NEXT CHAPTER' : 'GOOD TO HAVE YOU BACK'}</p><h1>{isRegister ? 'Join the campus.' : 'Welcome back.'}</h1>      <p className="auth-subtitle">{isRegister ? 'Create a student or volunteer account to join campus events.' : 'Sign in to pick up where you left off.'}</p>
        <form className="auth-form" onSubmit={submit}>
          {isRegister && <label>Full name<input name="name" autoComplete="name" required minLength="2" maxLength="100" value={form.name} onChange={update} placeholder="Your name" /></label>}
          <label>College email<input name="email" type="email" autoComplete="email" required maxLength="254" value={form.email} onChange={update} placeholder="you@college.edu" /></label>
          <label>Password<input name="password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={isRegister ? 10 : 10} maxLength="128" value={form.password} onChange={update} placeholder={isRegister ? 'At least 10 characters' : 'Enter your password'} /></label>
          {isRegister && <label>Account type<select name="role" value={form.role} onChange={update}><option value="student">Student</option><option value="volunteer">Volunteer</option></select></label>}
          {isRegister && <div className="form-row"><label>Department <span className="optional">(optional)</span><input name="department" maxLength="100" value={form.department} onChange={update} placeholder="e.g. Computer Science" /></label>{form.role === 'student' && <label>Year <span className="optional">(optional)</span><select name="yearOfStudy" value={form.yearOfStudy} onChange={update}><option value="">Choose</option>{[1, 2, 3, 4].map((year) => <option key={year} value={year}>Year {year}</option>)}</select></label>}</div>}
          <Notice>{error}</Notice>
          <button type="submit" className="button button-primary button-wide" disabled={busy}>{busy ? 'Please wait...' : isRegister ? 'Create student account' : 'Sign in'} <ArrowRight size={17} /></button>
        </form>
        <p className="auth-switch">{isRegister ? 'Already have an account?' : 'New to CampusFest?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create a student account'}</Link></p>
        {!isRegister && <p className="auth-role-help">Organiser and volunteer accounts are issued by a CampusFest administrator. Development demo login emails are listed in the README.</p>}
        <p className="auth-privacy"><ShieldCheck size={15} />Your password is securely hashed. Sign-in sessions use an HttpOnly cookie.</p>
      </div>
    </main>
  )
}

function Protected({ roles, children }) {
  const { user, authLoading } = useSession()
  if (authLoading) return <main className="page-shell"><div className="page-loading">Checking your session...</div></main>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorised" replace />
  return children
}

function ProfilePanel() {
  const { user, setUser } = useSession()
  const [form, setForm] = useState({
    name: user.name || '',
    department: user.department || '',
    yearOfStudy: user.yearOfStudy || '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const save = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { user: updated } = await api('/auth/me', {
        method: 'PATCH',
        body: { ...form, yearOfStudy: form.yearOfStudy ? Number(form.yearOfStudy) : null },
      })
      setUser(updated)
      setMessage('Your profile has been updated.')
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="profile-panel" aria-labelledby="profile-heading">
      <div className="profile-summary">
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h2 id="profile-heading">{user.name}</h2>
        <p>{user.email}</p>
        <span className="status-pill">{user.role}</span>
      </div>
      <form className="profile-form" onSubmit={save}>
        <label>Full name<input name="name" value={form.name} onChange={update} required minLength="2" maxLength="100" /></label>
        <label>Email<input value={user.email} readOnly /></label>
        <label>Department<input name="department" value={form.department} onChange={update} maxLength="100" placeholder="Optional" /></label>
        {user.role === 'student' && <label>Year of study<select name="yearOfStudy" value={form.yearOfStudy} onChange={update}><option value="">Not provided</option>{[1, 2, 3, 4, 5, 6, 7, 8].map((year) => <option key={year} value={year}>Year {year}</option>)}</select></label>}
        <div className="profile-actions"><button className="button button-outline button-small" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save details'}</button><span>{message}</span></div>
        <Notice>{error}</Notice>
      </form>
    </section>
  )
}

function DashboardPage() {
  const { user } = useSession()
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [eventList, setEventList] = useState([])
  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api('/dashboard')
      setDashboard(result)
      setEventList(result.events || [])
      setError('')
    } catch (failure) {
      setError(failure.message)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { refresh() }, [refresh])
  const title = user.role === 'organiser' ? 'Organiser desk' : user.role === 'administrator' ? 'Platform overview' : user.role === 'volunteer' ? 'Volunteer space' : 'Your campus, your plans'
  const cancelRegistration = async (registrationId) => {
    if (!window.confirm('Cancel this registration?')) return
    try {
      await api(`/events/registrations/${registrationId}/cancel`, { method: 'POST' })
      setMessage('Registration cancelled.')
      await refresh()
    } catch (failure) { setError(failure.message) }
  }
  const deleteEvent = async (event) => {
    if (!window.confirm(`Permanently delete "${event.title}"? Only draft or cancelled events without registrations, volunteer applications, or feedback can be deleted.`)) return
    setError('')
    setMessage('')
    try {
      await api(`/events/${event._id}`, { method: 'DELETE' })
      setMessage(`Deleted "${event.title}".`)
      await refresh()
    } catch (failure) {
      setError(failure.message)
    }
  }
  return (
    <main className="dashboard-shell">
      <div className="dashboard-top"><div><p className="eyebrow">{user.role.toUpperCase()} / CAMPUSFEST</p><h1>{title}<span>.</span></h1><p>Welcome in, {user.name}.</p></div><Link to="/events" className="button button-outline">Explore events <ArrowUpRight size={16} /></Link></div>
      <Notice>{error}</Notice><Notice tone="success">{message}</Notice>
      {loading ? <LoadingCards /> : dashboard && (
        <>
          <ProfilePanel />
          {['organiser', 'administrator'].includes(user.role) && <><div className="metric-grid">
            <Metric label="Events" value={dashboard.metrics.eventCount} icon={<CalendarDays size={19} />} />
            <Metric label="Registrations" value={dashboard.metrics.registrationCount} icon={<Users size={19} />} />
            <Metric label="Attended" value={dashboard.metrics.attendanceCount} icon={<Check size={19} />} />
            <Metric label="Average rating" value={dashboard.metrics.averageRating.toFixed(1)} icon={<ShieldCheck size={19} />} />
          </div>
          {user.role === 'administrator' && <Metric label="Platform users" value={dashboard.metrics.userCount} icon={<CircleUserRound size={19} />} />}
          <div className="dashboard-section-heading"><div><p className="eyebrow">YOUR PROGRAMME</p><h2>Manage events</h2></div><Link className="button button-primary" to="/organiser/events/new">Create event <ArrowRight size={16} /></Link></div>
          {eventList.length ? <div className="dashboard-table-wrap"><table className="data-table"><thead><tr><th>Event</th><th>Date</th><th>Places</th><th>Status</th><th>Manage</th></tr></thead><tbody>{eventList.map((event) => <tr key={event._id}><td><strong>{event.title}</strong><small>{event.category} · {event.venue}</small></td><td>{formatDate(event.startAt)}</td><td>{event.registeredCount} / {event.capacity}</td><td><span className={`status-pill status-${event.status}`}>{event.status}</span></td><td className="event-manage-actions"><Link to={`/organiser/events/${event._id}`}>Participants <ArrowRight size={14} /></Link><Link to={`/organiser/events/${event._id}/volunteers`}>Volunteers <ArrowRight size={14} /></Link><button className="button button-outline button-small event-delete-button" type="button" onClick={() => deleteEvent(event)}>Delete event</button></td></tr>)}</tbody></table></div> : <div className="empty-state"><CalendarDays size={22} /><strong>No events yet.</strong><span>Create your first event to start building the programme.</span></div>}
          {user.role === 'administrator' && <AdminPanel />}</>}
          {user.role === 'student' && <><SectionHeading eyebrow="YOUR RSVP LIST" title="Plans worth keeping." copy="Your free registrations and attendance passes live here." link="Find more events" /><div className="registration-list">{dashboard.registrations?.length ? dashboard.registrations.map((registration) => <article className="registration-row" key={registration._id}><div className="registration-date">{registration.event ? new Date(registration.event.startAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'}</div><div className="registration-info"><Link to={`/events/${registration.event?._id}`}><strong>{registration.event?.title || 'Event removed'}</strong></Link><span>{registration.event?.venue || ''}</span><small>{registration.reference} · Free entry</small></div><span className={`status-pill status-${registration.status}`}>{registration.status}</span>{registration.attendanceToken && <AttendancePass token={registration.attendanceToken} />}{registration.status === 'confirmed' && <button className="button button-outline button-small" type="button" onClick={() => cancelRegistration(registration._id)}>Cancel</button>}{registration.status === 'attended' && <a className="button button-outline button-small" href={`/api/events/registrations/${registration._id}/certificate`}>Download certificate</a>}{registration.status === 'attended' && !dashboard.feedbackEventIds?.includes(registration.event?._id) && <FeedbackForm eventId={registration.event?._id} onSubmitted={refresh} />}</article>) : <div className="empty-state"><Ticket size={22} /><strong>Your next great story is waiting.</strong><span>Events you register for will show up here.</span><Link to="/events" className="text-link">Browse events <ArrowRight size={15} /></Link></div>}</div><div className="notification-list"><h2>Recent updates</h2>{dashboard.notifications?.length ? dashboard.notifications.map((item) => <p key={item._id}><span />{item.message}<small>{formatDate(item.createdAt)}</small></p>) : <p className="muted-copy">No updates to show right now.</p>}</div></>}
          {user.role === 'volunteer' && <><div className="dashboard-section-heading"><div><p className="eyebrow">YOUR VOLUNTEER CALLS</p><h2>Applications & assignments</h2></div><Link className="button button-outline" to="/volunteer/opportunities">Browse opportunities <ArrowRight size={16} /></Link></div>{dashboard.applications?.length ? dashboard.applications.map((application) => <article className="registration-row" key={application._id}><div className="registration-info"><strong>{application.event.title}</strong><span>{application.event.venue} / {formatDate(application.event.startAt)}</span><small>{application.roleInterest}{application.duty ? ` / ${application.duty}` : ''}{application.shift ? ` / ${application.shift}` : ''}</small></div><span className={`status-pill status-${application.status}`}>{application.status}</span>{application.status === 'accepted' && <Link className="button button-outline button-small" to={`/volunteer/events/${application.event._id}/checkin`}>Check-in desk <ArrowRight size={14} /></Link>}</article>) : <div className="empty-state"><Users size={22} /><strong>Ready to be part of the crew?</strong><span>Find an event that could use a hand.</span><Link to="/volunteer/opportunities" className="text-link">Browse opportunities <ArrowRight size={15} /></Link></div>}</>}
        </>
      )}
      <Footer />
    </main>
  )
}

function Metric({ label, value, icon }) {
  return <article className="metric-card"><span className="metric-icon">{icon}</span><span>{label}</span><strong>{value}</strong></article>
}

function AdminPanel() {
  const { user: currentUser } = useSession()
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  useEffect(() => { api('/admin/users?limit=20').then(({ users: results }) => setUsers(results)).catch((failure) => setError(failure.message)) }, [])
  const updateUser = async (id, values) => {
    try {
      const { user: updated } = await api(`/admin/users/${id}`, { method: 'PATCH', body: values })
      setUsers((current) => current.map((user) => user._id === id ? { ...user, ...updated } : user))
    } catch (failure) { setError(failure.message) }
  }
  return <section className="admin-panel"><div className="dashboard-section-heading"><div><p className="eyebrow">ACCESS CONTROL</p><h2>Account roles</h2></div></div><Notice>{error}</Notice><div className="dashboard-table-wrap"><table className="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Change role</th><th>Account</th></tr></thead><tbody>{users.map((user) => <tr key={user._id}><td>{user.name}</td><td>{user.email}</td><td>{user.role}</td><td><select value={user.role} onChange={(event) => updateUser(user._id, { role: event.target.value })} aria-label={`Change role for ${user.name}`}>{['student', 'organiser', 'volunteer', 'administrator'].map((role) => <option key={role}>{role}</option>)}</select></td><td><button className="button button-outline button-small" type="button" disabled={user._id === currentUser.id} onClick={() => updateUser(user._id, { active: !user.active })}>{user.active ? 'Suspend' : 'Reactivate'}</button></td></tr>)}</tbody></table></div></section>
}

function OrganizerEventForm() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', category: 'Technology', venue: '', startAt: '', endAt: '', registrationDeadline: '',
    capacity: '100', eligibility: '', rules: '', contactEmail: '', volunteersNeeded: false, imageUrl: '',
  })
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))
  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const values = { ...form, capacity: Number(form.capacity), startAt: new Date(form.startAt).toISOString(), endAt: new Date(form.endAt).toISOString(), registrationDeadline: new Date(form.registrationDeadline).toISOString() }
      const { event: created } = await api('/events', { method: 'POST', body: values })
      if (form.publishNow) await api(`/events/${created._id}/publish`, { method: 'POST' })
      navigate('/dashboard')
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <main className="form-page"><Link to="/dashboard" className="back-link">Back to dashboard</Link><p className="eyebrow">ORGANISER DESK / NEW LISTING</p><h1>Put it on the <em>calendar.</em></h1><p className="form-intro">Events start as drafts. Publish when the details are ready.</p><form className="event-form" onSubmit={submit}>
    <label>Event title<input name="title" value={form.title} onChange={change} required minLength="3" maxLength="140" placeholder="Give it a name people will remember" /></label>
    <label>Description<textarea name="description" rows="5" value={form.description} onChange={change} required minLength="10" maxLength="8000" placeholder="What should people know before they join?" /></label>
    <div className="form-row"><label>Category<select name="category" value={form.category} onChange={change}>{categories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label><label>Venue<input name="venue" value={form.venue} onChange={change} required maxLength="200" placeholder="Campus venue" /></label></div>
    <div className="form-row"><label>Starts<input name="startAt" type="datetime-local" value={form.startAt} onChange={change} required /></label><label>Ends<input name="endAt" type="datetime-local" value={form.endAt} onChange={change} required /></label></div>
    <div className="form-row"><label>Registration deadline<input name="registrationDeadline" type="datetime-local" value={form.registrationDeadline} onChange={change} required /></label><label>Capacity<input name="capacity" type="number" value={form.capacity} onChange={change} min="1" max="100000" required /></label></div>
    <div className="form-row"><label>Entry fee<input value="Free" readOnly /><small>All CampusFest events are free to attend.</small></label><label>Contact email<input name="contactEmail" type="email" value={form.contactEmail} onChange={change} /></label></div>
    <label>Eligibility <span className="optional">(optional)</span><input name="eligibility" value={form.eligibility} onChange={change} maxLength="1000" /></label><label>Rules <span className="optional">(optional)</span><textarea name="rules" rows="3" value={form.rules} onChange={change} maxLength="3000" /></label>
    <label className="checkbox-label"><input type="checkbox" name="volunteersNeeded" checked={form.volunteersNeeded} onChange={change} /> We're looking for volunteers</label><label className="checkbox-label"><input type="checkbox" name="publishNow" checked={form.publishNow || false} onChange={change} /> Publish once this event is saved</label>
    <Notice>{error}</Notice><button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Saving...' : 'Save event'} <ArrowRight size={16} /></button>
  </form><Footer /></main>
}

function ParticipantsPage() {
  const { id } = useParams()
  const [data, setData] = useState([])
  const [error, setError] = useState('')
  const [token, setToken] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => { api(`/events/${id}/participants`).then(({ registrations }) => setData(registrations)).catch((failure) => setError(failure.message)) }, [id])
  const checkIn = async (event) => {
    event.preventDefault()
    setMessage('')
    try {
      const { registration } = await api(`/events/${id}/check-in`, { method: 'POST', body: { token } })
      setMessage(`Checked in ${registration.student}.`)
      setToken('')
      setData((current) => current.map((item) => item.reference === registration.reference ? { ...item, status: 'attended', checkedInAt: registration.checkedInAt } : item))
    } catch (failure) { setError(failure.message) }
  }
  return <main className="dashboard-shell"><Link to="/dashboard" className="back-link">Back to dashboard</Link><p className="eyebrow">ATTENDANCE DESK</p><h1>Participant <em>list.</em></h1><Notice>{error}</Notice><Notice tone="success">{message}</Notice><form className="checkin-form" onSubmit={checkIn}><label>Manual check-in token<input value={token} onChange={(event) => setToken(event.target.value)} minLength="40" maxLength="100" required placeholder="Scan QR or enter the attendee token" /></label><button className="button button-primary" type="submit">Check in <Check size={16} /></button></form><a className="text-link export-link" href={`/api/events/${id}/participants.csv`}>Export participant CSV <ExternalLink size={15} /></a><div className="dashboard-table-wrap"><table className="data-table"><thead><tr><th>Participant</th><th>Registration</th><th>Registered</th><th>Status</th><th>Attendance</th></tr></thead><tbody>{data.map((row) => <tr key={row._id}><td><strong>{row.student.name}</strong><small>{row.student.email}</small></td><td>{row.reference}</td><td>{formatDate(row.createdAt)}</td><td><span className={`status-pill status-${row.status}`}>{row.status}</span></td><td>{row.checkedInAt ? formatDate(row.checkedInAt) : 'Not checked in'}</td></tr>)}</tbody></table></div><Footer /></main>
}

function VolunteerManagementPage() {
  const { id } = useParams()
  const [applications, setApplications] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState('')
  useEffect(() => {
    api(`/events/${id}/volunteers`)
      .then(({ applications: rows }) => setApplications(rows))
      .catch((failure) => setError(failure.message))
  }, [id])

  const updateApplication = async (application, formEvent) => {
    formEvent.preventDefault()
    setBusy(application._id)
    setError('')
    setMessage('')
    const form = new FormData(formEvent.currentTarget)
    try {
      const { application: updated } = await api(`/events/volunteers/${application._id}`, {
        method: 'PATCH',
        body: {
          status: form.get('status'),
          duty: form.get('duty'),
          shift: form.get('shift'),
        },
      })
      setApplications((current) => current.map((row) => row._id === updated._id ? { ...row, ...updated } : row))
      setMessage(`Updated ${application.volunteer.name}.`)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <main className="dashboard-shell">
      <Link to="/dashboard" className="back-link">← Back to dashboard</Link>
      <p className="eyebrow">ORGANISER / VOLUNTEER ASSIGNMENTS</p>
      <h1>Build your <em>crew.</em></h1>
      <p className="form-intro">Review volunteers who applied to this event, then accept them and assign a duty and shift.</p>
      <Notice>{error}</Notice><Notice tone="success">{message}</Notice>
      {applications.length ? <div className="volunteer-management-list">{applications.map((application) => (
        <form className="volunteer-assignment" key={application._id} onSubmit={(event) => updateApplication(application, event)}>
          <div className="volunteer-assignment-person">
            <strong>{application.volunteer.name}</strong>
            <span>{application.volunteer.email}</span>
            <small>Interested in: {application.roleInterest}</small>
          </div>
          <span className={`status-pill status-${application.status}`}>{application.status}</span>
          <label>Status<select name="status" defaultValue={application.status === 'pending' ? 'accepted' : application.status}>{['accepted', 'declined', 'completed'].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label>Duty<input name="duty" defaultValue={application.duty || application.roleInterest} maxLength="200" placeholder="e.g. Registration desk" /></label>
          <label>Shift<input name="shift" defaultValue={application.shift || ''} maxLength="200" placeholder="e.g. 9:00 AM–12:00 PM" /></label>
          <button className="button button-outline button-small" type="submit" disabled={busy === application._id}>{busy === application._id ? 'Saving…' : application.status === 'pending' ? 'Assign volunteer' : 'Save assignment'}</button>
        </form>
      ))}</div> : !error && <div className="empty-state"><Users size={22} /><strong>No volunteer applications yet.</strong><span>Ask volunteers to register as volunteers and apply to this event.</span></div>}
      <Footer />
    </main>
  )
}

function FeedbackForm({ eventId, onSubmitted }) {
  const [rating, setRating] = useState('5')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await api(`/events/${eventId}/feedback`, { method: 'POST', body: { rating: Number(rating), comment } })
      setSubmitted(true)
      onSubmitted()
    } catch (failure) { setError(failure.message) }
  }
  if (submitted) return <span className="feedback-success"><Check size={14} /> Feedback sent</span>
  return <form className="feedback-form" onSubmit={submit}><label>Rate it<select value={rating} onChange={(event) => setRating(event.target.value)}>{[5, 4, 3, 2, 1].map((score) => <option key={score} value={score}>{score} / 5</option>)}</select></label><label>Note <input value={comment} onChange={(event) => setComment(event.target.value)} maxLength="1500" placeholder="What stood out?" /></label><button className="button button-outline button-small" type="submit">Send feedback</button>{error && <span className="feedback-error">{error}</span>}</form>
}

function VolunteerCheckinPage() {
  const { id } = useParams()
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const checkIn = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      const { registration } = await api(`/events/${id}/check-in`, { method: 'POST', body: { token } })
      setMessage(`Checked in ${registration.student}.`)
      setToken('')
    } catch (failure) { setError(failure.message) }
  }
  return <main className="form-page"><Link to="/dashboard" className="back-link">Back to dashboard</Link><p className="eyebrow">VOLUNTEER / CHECK-IN</p><h1>Welcome them <em>in.</em></h1><p className="form-intro">Scan a check-in pass with a QR reader or enter the attendee’s manual code. An attendance certificate is emailed after check-in when SMTP is configured.</p><form className="event-form checkin-form" onSubmit={checkIn}><label>Attendance pass code<input value={token} onChange={(event) => setToken(event.target.value)} required minLength="40" maxLength="100" placeholder="Enter the attendee’s manual check-in code" /></label><Notice>{error}</Notice><Notice tone="success">{message}</Notice><button className="button button-primary" type="submit">Validate check-in <ShieldCheck size={16} /></button></form><Footer /></main>
}

function OpportunitiesPage() {
  const { user } = useSession()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [applyingTo, setApplyingTo] = useState('')
  const [roleInterest, setRoleInterest] = useState('')
  useEffect(() => { api('/events/volunteer/opportunities').then(({ events: result }) => setEvents(result)).catch((failure) => setError(failure.message)) }, [])
  const apply = async (eventId, formEvent) => {
    formEvent.preventDefault()
    if (!user) return navigate('/login', { state: { from: '/volunteer/opportunities' } })
    setBusy(eventId)
    try {
      await api(`/events/volunteer/${eventId}/apply`, { method: 'POST', body: { roleInterest: roleInterest.trim() } })
      setNotice('Application submitted.')
      setApplyingTo('')
      setRoleInterest('')
      setEvents((current) => current.filter((event) => event._id !== eventId))
    } catch (failure) { setError(failure.message) } finally { setBusy('') }
  }
  return <main className="page-shell"><div className="page-heading"><p className="eyebrow">LEND A HAND / FIND YOUR CREW</p><h1>Be part of <em>the making.</em></h1><p>Get behind the scenes and help make a campus moment happen.</p></div><Notice>{error}</Notice><Notice tone="success">{notice}</Notice>{events.length ? <div className="event-grid">{events.map((event) => <article className="opportunity-card" key={event._id}><span className="event-category">{event.category}</span><h2>{event.title}</h2><p><MapPin size={15} />{event.venue}</p><p><CalendarDays size={15} />{formatDate(event.startAt)}</p>{applyingTo === event._id ? <form className="volunteer-application-form" onSubmit={(formEvent) => apply(event._id, formEvent)}><label>Role you'd like to help with<input value={roleInterest} onChange={(formEvent) => setRoleInterest(formEvent.target.value)} minLength="2" maxLength="100" required placeholder="e.g. check-in desk" /></label><button className="button button-primary" type="submit" disabled={busy === event._id}>{busy === event._id ? 'Applying...' : 'Submit application'} <ArrowRight size={16} /></button></form> : <button className="button button-primary" type="button" onClick={() => setApplyingTo(event._id)}>Apply to help <ArrowRight size={16} /></button>}</article>)}</div> : !error && <div className="empty-state"><Users size={22} /><strong>No volunteer calls right now.</strong><span>Check again closer to the next campus event.</span></div>}<Footer /></main>
}

function SimpleInfo({ title, children }) {
  return <main className="page-shell"><div className="page-heading"><p className="eyebrow">CAMPUSFEST / INFORMATION</p><h1>{title}</h1><p>{children}</p></div><Link className="text-link" to="/">Back to home <ArrowRight size={15} /></Link><Footer /></main>
}

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  useEffect(() => {
    let active = true
    api('/auth/me').then(({ user: current }) => { if (active) setUser(current) }).catch(() => { if (active) setUser(null) }).finally(() => { if (active) setAuthLoading(false) })
    return () => { active = false }
  }, [])
  const context = useMemo(() => ({ user, setUser, authLoading }), [user, authLoading])
  return (
    <SessionContext.Provider value={context}>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventPage />} />
        <Route path="/login" element={user ? <Navigate to={roleHome[user.role]} replace /> : <AuthPage mode="login" />} />
        <Route path="/register" element={user ? <Navigate to={roleHome[user.role]} replace /> : <AuthPage mode="register" />} />
        <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
        <Route path="/organiser/events/new" element={<Protected roles={['organiser', 'administrator']}><OrganizerEventForm /></Protected>} />
        <Route path="/organiser/events/:id" element={<Protected roles={['organiser', 'administrator']}><ParticipantsPage /></Protected>} />
        <Route path="/organiser/events/:id/volunteers" element={<Protected roles={['organiser', 'administrator']}><VolunteerManagementPage /></Protected>} />
        <Route path="/volunteer/events/:id/checkin" element={<Protected roles={['volunteer']}><VolunteerCheckinPage /></Protected>} />
        <Route path="/volunteer/opportunities" element={<Protected roles={['volunteer']}><OpportunitiesPage /></Protected>} />
        <Route path="/privacy" element={<SimpleInfo title="Privacy, with purpose.">CampusFest stores the account and participation information needed to run free event registration, attendance certificates, and email notifications. SMTP delivery is controlled by the service operator.</SimpleInfo>} />
        <Route path="/terms" element={<SimpleInfo title="The ground rules.">Use your own account, follow event organiser guidance, and keep your private attendance pass to yourself. All CampusFest events are free; event cancellation and eligibility terms are set by the relevant organiser.</SimpleInfo>} />
        <Route path="/unauthorised" element={<SimpleInfo title="This space isn't yours to enter.">Your account does not have permission to open this page.</SimpleInfo>} />
        <Route path="*" element={<SimpleInfo title="That page wandered off.">We can't find the page you were looking for.</SimpleInfo>} />
      </Routes>
    </SessionContext.Provider>
  )
}

export default App
