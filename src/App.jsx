import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import { supabase, configured } from './supabase.js'

function useSession() {
  const [session, setSession] = useState(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return session
}

function Protected({ session, children }) {
  if (session === undefined) return <p className="center">Loading…</p>
  return session ? children : <Navigate to="/signin" replace />
}

function AuthForm({ mode, session }) {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const signup = mode === 'signup'
  if (session) return <Navigate to="/dashboard" replace />

  async function submit(e) {
    e.preventDefault()
    setErr(''); setMsg(''); setBusy(true)
    const { data, error } = signup
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + '/dashboard' } })
      : await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) return setErr(error.message)
    if (signup && !data.session) return setMsg('Check your email to confirm your account, then sign in.')
    nav('/dashboard')
  }

  return (
    <form className="card" onSubmit={submit}>
      <h1>{signup ? 'Create your account' : 'Welcome back'}</h1>
      {!configured && <p className="error">Supabase env vars are missing.</p>}
      <label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
      <label>Password<input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} autoComplete={signup ? 'new-password' : 'current-password'} /></label>
      {err && <p className="error">{err}</p>}
      {msg && <p className="ok">{msg}</p>}
      <button disabled={busy}>{busy ? 'Please wait…' : signup ? 'Sign up' : 'Sign in'}</button>
      <p className="alt">{signup ? <>Have an account? <Link to="/signin">Sign in</Link></> : <>New here? <Link to="/signup">Sign up</Link></>}</p>
    </form>
  )
}

function Dashboard({ session }) {
  const nav = useNavigate()
  const user = session.user
  const [q, setQ] = useState('')
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ss_searches_' + user.id)) || [] } catch { return [] }
  })
  useEffect(() => { try { localStorage.setItem('ss_searches_' + user.id, JSON.stringify(items)) } catch {} }, [items, user.id])

  function add(e) {
    e.preventDefault()
    if (!q.trim()) return
    setItems([{ id: Date.now(), text: q.trim(), at: new Date().toLocaleString() }, ...items])
    setQ('')
  }
  async function out() { await supabase.auth.signOut(); nav('/signin') }

  return (
    <div className="wrap">
      <header><strong>🌱 SearchSprout</strong><span>{user.email} <button className="link" onClick={out}>Sign out</button></span></header>
      <main>
        <h1>Dashboard</h1>
        <div className="stats">
          <div className="stat"><b>{items.length}</b><span>Saved searches</span></div>
          <div className="stat"><b>{new Date(user.created_at).toLocaleDateString()}</b><span>Member since</span></div>
        </div>
        <form className="row" onSubmit={add}>
          <input placeholder="Add a search…" value={q} onChange={e => setQ(e.target.value)} />
          <button>Save</button>
        </form>
        {items.length === 0 ? <p className="muted">No searches yet.</p> : (
          <ul>{items.map(i => (
            <li key={i.id}><span>{i.text}<small>{i.at}</small></span>
              <button className="link" onClick={() => setItems(items.filter(x => x.id !== i.id))}>Remove</button></li>
          ))}</ul>
        )}
      </main>
    </div>
  )
}

function Landing({ session }) {
  return (
    <div className="site">
      <header className="nav">
        <strong>🌱 SearchSprout</strong>
        <nav>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          {session ? <Link className="btn" to="/dashboard">Dashboard</Link> : <><Link to="/signin">Sign in</Link><Link className="btn" to="/signup">Get started</Link></>}
        </nav>
      </header>
      <section className="hero">
        <h1>Grow better searches.</h1>
        <p>SearchSprout helps you save, organize and revisit the searches that matter, all in one private dashboard.</p>
        <div className="cta">
          <Link className="btn big" to={session ? '/dashboard' : '/signup'}>{session ? 'Open dashboard' : 'Get started'}</Link>
          {!session && <Link className="btn big ghost" to="/signin">Sign in</Link>}
        </div>
      </section>
      <section id="features" className="grid">
        <div className="feat"><h3>🔎 Save searches</h3><p>Capture a search in one click and keep it with a timestamp.</p></div>
        <div className="feat"><h3>🔒 Private by default</h3><p>Secure email sign-in powered by Supabase. Your list is yours.</p></div>
        <div className="feat"><h3>📊 Simple dashboard</h3><p>See your activity and manage everything from one place.</p></div>
      </section>
      <section id="how" className="how">
        <h2>How it works</h2>
        <ol><li>Create your account</li><li>Add the searches you care about</li><li>Come back any time from the dashboard</li></ol>
      </section>
      <footer>© {new Date().getFullYear()} SearchSprout</footer>
    </div>
  )
}

export default function App() {
  const session = useSession()
  return (
    <Routes>
      <Route path="/" element={<Landing session={session} />} />
      <Route path="/signin" element={<AuthForm mode="signin" session={session} />} />
      <Route path="/signup" element={<AuthForm mode="signup" session={session} />} />
      <Route path="/dashboard" element={<Protected session={session}><Dashboard session={session} /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
