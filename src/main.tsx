import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Archive, ArrowRight, Bell, BookOpen, Check, ChevronRight, CircleHelp, Clock3,
  Droplets, Edit3, Flame, Flower2, Heart, Home, ListChecks, Menu, MoreHorizontal,
  Moon, Pause, Pencil, Play, Plus, RotateCcw, Settings, Sparkles, Sun, TimerReset,
  Trash2, Utensils, X, Zap
} from 'lucide-react'
import './styles.css'
import { exportStoredData, importStoredData, readStored, writeStored } from './storage'
import { PixelCat } from './components/PixelCat'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'))
}

type Tab = 'today' | 'routines' | 'timers' | 'recipes' | 'library'
type Mode = 'normal' | 'low' | 'minimum'
type Task = { id: number; title: string; category: string; time: string; duration: number; energy: string; done: boolean; skipped?: boolean; low: boolean; essential: boolean }
type TimerItem = { id: number; title: string; total: number; endsAt: number | null; paused: boolean; remaining: number; color: string }
type Routine = { id: number; title: string; detail: string; color: string; tasks: string[] }
type Recipe = { title: string; meta: string; emoji: string; color: string; tags: string[] }

const initialTasks: Task[] = [
  { id: 1, title: 'Drink a glass of water', category: 'Health', time: '08:00', duration: 2, energy: 'tiny', done: true, low: true, essential: true },
  { id: 2, title: 'Take morning medication', category: 'Medication', time: '08:30', duration: 2, energy: 'tiny', done: false, low: true, essential: true },
  { id: 3, title: 'Gentle morning skincare', category: 'Self-care', time: '09:00', duration: 8, energy: 'low', done: false, low: true, essential: false },
  { id: 4, title: 'Put laundry away', category: 'Home', time: '11:30', duration: 15, energy: 'medium', done: false, low: false, essential: false },
  { id: 5, title: 'Make something nourishing', category: 'Food', time: '13:00', duration: 20, energy: 'medium', done: false, low: true, essential: true },
  { id: 6, title: 'Evening wind-down', category: 'Self-care', time: '21:00', duration: 12, energy: 'low', done: false, low: true, essential: false },
]
const recipes: Recipe[] = [
  { title: 'Comfort bowl', meta: '20 min · easy', emoji: '🍚', color: 'yellow', tags: ['quick', 'vegetarian'] },
  { title: 'Crispy potato tacos', meta: '35 min · cozy', emoji: '🌮', color: 'teal', tags: ['dinner'] },
  { title: 'Berry overnight oats', meta: '5 min · breakfast', emoji: '🫐', color: 'pink', tags: ['no-cook'] },
]
const routines = [
  { title: 'Gentle morning', detail: '3 tasks · 12 min', icon: Sun, color: 'yellow' },
  { title: 'Evening wind-down', detail: '4 tasks · 25 min', icon: Moon, color: 'lavender' },
  { title: 'Sunday reset', detail: '5 tasks · 45 min', icon: Home, color: 'teal' },
]

function useStored<T>(key: string, value: T): [T, (next: T) => void] {
  const [state, setState] = useState<T>(value)
  useEffect(() => { void readStored(key, value).then(setState) }, [key])
  const update = (next: T) => { setState(next); void writeStored(key, next) }
  return [state, update]
}

function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [mode, setMode] = useStored<Mode>('softly-mode', 'normal')
  const [tasks, setTasks] = useStored<Task[]>('softly-tasks', initialTasks)
  const [timers, setTimers] = useStored<TimerItem[]>('softly-timers', [])
  const [savedRoutines, setSavedRoutines] = useStored<Routine[]>('softly-routines', [])
  const [savedRecipes, setSavedRecipes] = useStored<Recipe[]>('softly-recipes', [])
  const [showAdd, setShowAdd] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showRoutine, setShowRoutine] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null)
  const [energy, setEnergy] = useStored<string>('softly-energy', '')
  const [theme, setTheme] = useStored<string>('softly-theme', 'Pastel pink')
  useEffect(() => {
    const themes: Record<string, [string, string, string]> = { 'Pastel pink': ['#fff6f7', '#f5a3be', '#ed66b2'], 'Lavender dream': ['#fbf8ff', '#d9c7ee', '#9c78ce'], 'Mint & cream': ['#f5fffc', '#a8e8d8', '#4bb7a6'], Monochrome: ['#f5f5f5', '#d0d0d0', '#242024'] }
    const [background, primary, accent] = themes[theme] || themes['Pastel pink']
    document.documentElement.style.setProperty('--bg', background); document.documentElement.style.setProperty('--pink', primary); document.documentElement.style.setProperty('--magenta', accent)
  }, [theme])
  const [toast, setToast] = useState('')
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  useEffect(() => { if (toast) { const id = setTimeout(() => setToast(''), 2600); return () => clearTimeout(id) } }, [toast])
  const visibleTasks = mode === 'normal' ? tasks : tasks.filter(t => mode === 'minimum' ? t.essential : t.low)
  const complete = visibleTasks.filter(t => t.done).length
  const remaining = visibleTasks.filter(t => !t.done).reduce((sum, t) => sum + t.duration, 0)
  const toggleTask = (id: number) => setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))
  const addTask = (title: string) => {
    setTasks([...tasks, { id: Date.now(), title, category: 'Miscellaneous', time: 'Anytime', duration: 10, energy: 'low', done: false, low: true, essential: false }])
    setShowAdd(false); setToast('Added to today')
  }
  const saveTask = (next: Task) => { setTasks(tasks.some(task => task.id === next.id) ? tasks.map(task => task.id === next.id ? next : task) : [...tasks, next]); setEditingTask(null); setToast('Task saved') }
  const updateTask = (id: number, patch: Partial<Task>) => setTasks(tasks.map(task => task.id === id ? { ...task, ...patch } : task))
  const addTimer = (minutes: number, title = 'Focus timer') => {
    setTimers([...timers, { id: Date.now(), title, total: minutes * 60, endsAt: Date.now() + minutes * 60000, paused: false, remaining: minutes * 60, color: ['pink', 'teal', 'yellow'][timers.length % 3] }])
    setToast(`${title} started`)
  }
  const updateTimer = (timer: TimerItem, action: 'pause' | 'restart' | 'delete') => {
    if (action === 'delete') return setTimers(timers.filter(t => t.id !== timer.id))
    if (action === 'restart') return setTimers(timers.map(t => t.id === timer.id ? { ...t, endsAt: Date.now() + t.total * 1000, remaining: t.total, paused: false } : t))
    const remaining = timer.endsAt ? Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000)) : timer.remaining
    setTimers(timers.map(t => t.id === timer.id ? { ...t, paused: !t.paused, remaining, endsAt: t.paused ? Date.now() + t.remaining * 1000 : null } : t))
  }
  return <div className="app">
    <header className="topbar"><div className="brand"><span className="brand-mark">✦</span><span>softly</span></div><div className="top-actions"><button className="icon-btn" aria-label="Help" onClick={() => setToast('Tip: tap a circle to complete a task')}><CircleHelp size={18}/></button><button className="avatar" aria-label="Open profile" onClick={() => setShowProfile(true)}>A</button></div></header>
    <main className="main">
      {tab === 'today' && <Today mode={mode} setMode={setMode} tasks={visibleTasks} complete={complete} remaining={remaining} toggleTask={toggleTask} updateTask={updateTask} setToast={setToast} setShowAdd={setShowAdd} setEnergy={setEnergy} energy={energy} onEditTask={setEditingTask} />}
      {tab === 'routines' && <Routines savedRoutines={savedRoutines} setSavedRoutines={setSavedRoutines} setToast={setToast} onNew={() => setShowRoutine(true)} onEdit={setEditingRoutine} />}
      {tab === 'timers' && <Timers timers={timers} now={now} addTimer={addTimer} updateTimer={updateTimer} />}
      {tab === 'recipes' && <Recipes recipes={[...recipes, ...savedRecipes]} addTimer={addTimer} setToast={setToast} onAdd={recipe => { setSavedRecipes([...savedRecipes, recipe]); setToast('Recipe added') }} />}
      {tab === 'library' && <Library setToast={setToast} />}
    </main>
    <nav className="bottom-nav">{([['today', ListChecks, 'Today'], ['routines', Flower2, 'Routines'], ['timers', Clock3, 'Timers'], ['recipes', Utensils, 'Recipes'], ['library', Archive, 'Library']] as const).map(([id, Icon, label]) => <button key={id} className={tab === id ? 'nav-item active' : 'nav-item'} onClick={() => setTab(id)}><Icon size={19}/><span>{label}</span>{id === 'timers' && timers.length > 0 && <b className="nav-dot">{timers.length}</b>}</button>)}</nav>
    {showAdd && <AddTask onAdd={addTask} onClose={() => setShowAdd(false)} />}
    {showProfile && <Profile onClose={() => setShowProfile(false)} onToast={setToast} />}
    {showRoutine && <RoutineForm onClose={() => setShowRoutine(false)} onSave={routine => { setSavedRoutines([...savedRoutines, routine]); setShowRoutine(false); setToast('Routine created') }} />}
    {editingRoutine && <RoutineForm initial={editingRoutine} onClose={() => setEditingRoutine(null)} onSave={routine => { setSavedRoutines(savedRoutines.map(item => item.id === routine.id ? routine : item)); setEditingRoutine(null); setToast('Routine updated') }} />}
    {editingTask && <TaskForm initial={editingTask} onClose={() => setEditingTask(null)} onSave={saveTask} />}
    {toast && <div className="toast"><Check size={16}/>{toast}</div>}
  </div>
}

function Today({ mode, setMode, tasks, complete, remaining, toggleTask, updateTask, setToast, setShowAdd, setEnergy, energy, onEditTask }: { mode: Mode; setMode: (m: Mode) => void; tasks: Task[]; complete: number; remaining: number; toggleTask: (id: number) => void; updateTask: (id: number, patch: Partial<Task>) => void; setToast: (s: string) => void; setShowAdd: (v: boolean) => void; setEnergy: (value: string) => void; energy: string; onEditTask: (task: Task) => void }) {
  const date = new Date()
  return <><section className="hero"><div><div className="eyebrow">{date.toLocaleDateString('en', { weekday: 'long' }).toUpperCase()} · {date.toLocaleDateString('en', { month: 'short', day: 'numeric' })}</div><h1>A softer day<br/><em>starts here.</em></h1><p className="hero-copy">Small steps count. You don't have to do it all.</p><PixelCat mood={mode === 'normal' ? 'sitting' : 'sleeping'} alt={mode === 'normal' ? 'A small sitting pixel cat' : 'A sleepy pixel cat for a low-energy day'}/></div><div className="sun-sticker">☼<span>good<br/>enough</span></div></section>
    <section className="mode-row"><div><span className="label">TODAY'S MODE</span><div className="mode-pills">{(['normal', 'low', 'minimum'] as Mode[]).map(m => <button key={m} className={mode === m ? 'mode-pill selected' : 'mode-pill'} onClick={() => { setMode(m); setToast(`${m === 'normal' ? 'Full' : m === 'low' ? 'Low-energy' : 'Minimum viable'} day selected`) }}>{m === 'normal' ? '☀ Normal' : m === 'low' ? '♡ Low energy' : '⌁ Minimum'}</button>)}</div></div><button className="icon-btn outlined" aria-label="Today settings" onClick={() => setToast('Today settings are ready to customize')}><Settings size={17}/></button></section>
    <section className="progress-card"><div className="progress-top"><div><span className="label">YOUR DAY</span><strong>{complete} <small>of {tasks.length} done</small></strong></div><span className="progress-percent">{tasks.length ? Math.round(complete / tasks.length * 100) : 0}%</span></div><div className="progress-bar"><i style={{ width: `${tasks.length ? complete / tasks.length * 100 : 0}%` }}/></div><div className="progress-foot"><span>{remaining ? `${tasks.filter(t => !t.done).length} tasks left` : 'All caught up'}</span><span>{remaining ? `about ${remaining} min` : 'Take a breather ✦'}</span></div></section>
    <section className="section-head"><div><span className="label">YOUR PLAN</span><h2>{mode === 'normal' ? 'A little structure' : mode === 'low' ? 'The gentle version' : 'Just the essentials'}</h2></div><button className="text-button" onClick={() => setShowAdd(true)}><Plus size={16}/> Add task</button></section>
    <section className="task-list">{tasks.map(task => <TaskCard key={task.id} task={task} toggle={toggleTask} updateTask={updateTask} setToast={setToast} onEdit={() => onEditTask(task)}/>)}</section>
    <button className="add-task" onClick={() => setShowAdd(true)}><Plus size={21}/><span>Add something small</span><ArrowRight size={17}/></button>
    <section className="check-in"><div className="check-icon"><Zap size={18}/></div><div><span className="label">HOW IS YOUR ENERGY?</span><p>{energy ? `${energy} energy saved for today.` : 'A quick check-in can help shape your day.'}</p></div><button className="round-arrow" aria-label="Set energy" onClick={() => { const next = energy === 'Very low' ? 'Low' : energy === 'Low' ? 'Medium' : energy === 'Medium' ? 'High' : 'Very low'; setEnergy(next); setToast(`${next} energy saved`) }}><ChevronRight size={18}/></button></section>
  </>
}

function TaskCard({ task, toggle, updateTask, setToast, onEdit }: { task: Task; toggle: (id: number) => void; updateTask: (id: number, patch: Partial<Task>) => void; setToast: (s: string) => void; onEdit: () => void }) {
  const [open, setOpen] = useState(false)
  return <article className={task.done ? 'task-card done' : task.skipped ? 'task-card skipped' : 'task-card'}><button className="check-circle" aria-label={`Mark ${task.title} ${task.done ? 'pending' : 'complete'}`} onClick={() => toggle(task.id)}>{task.done && <Check size={15}/>}</button><div className="task-main"><div className="task-meta"><span>{task.time}</span><span className={`tag ${task.category.toLowerCase().replace(' ', '-')}`}>{task.category}</span></div><h3>{task.title}</h3><div className="task-sub"><Clock3 size={13}/>{task.duration} min <span className="energy-dot"/> {task.energy} energy {task.skipped && <span>· skipped today</span>}</div></div><div className="task-actions"><button className="more-btn" aria-label={`Actions for ${task.title}`} onClick={() => setOpen(!open)}><MoreHorizontal size={19}/></button>{open && <div className="task-menu"><button onClick={() => { toggle(task.id); updateTask(task.id, { skipped: false }); setOpen(false) }}>{task.done ? 'Mark pending' : 'Complete today'}</button><button onClick={() => { updateTask(task.id, { skipped: true, done: false }); setOpen(false); setToast('Task skipped for today') }}>Skip today</button><button onClick={() => { updateTask(task.id, { skipped: false }); setOpen(false); setToast('Task restored for today') }}>Restore today</button><button onClick={() => { setOpen(false); onEdit() }}>Edit task</button></div>}</div></article>
}

function Routines({ savedRoutines, setSavedRoutines, setToast, onNew, onEdit }: { savedRoutines: Routine[]; setSavedRoutines: (r: Routine[]) => void; setToast: (s: string) => void; onNew: () => void; onEdit: (routine: Routine) => void }) {
  const all = [...routines.map((item, index) => ({ ...item, id: index, tasks: [] as string[] })), ...savedRoutines.map(item => ({ ...item, icon: Home }))]
  return <><PageHeader eyebrow="YOUR RHYTHMS" title="Routines" action={<button className="primary-btn" onClick={onNew}><Plus size={17}/> New routine</button>}/><div className="callout pink"><div className="callout-icon"><Sparkles size={20}/></div><div><strong>Make it repeatable</strong><p>Routines turn the things you care about into gentle defaults.</p></div></div><div className="section-head compact"><div><span className="label">YOUR ROUTINES</span></div><button className="text-button" onClick={() => setToast('Tap a routine to edit its name and steps')}>How to edit</button></div><div className="routine-grid">{all.map(({ title, detail, icon: Icon, color, id, tasks }) => <article className={`routine-card ${color}`} key={`${title}-${id}`} onClick={() => id >= 100 ? onEdit({ id, title, detail, color, tasks }) : setToast('Copy this starter template to edit it')}><div className="routine-icon"><Icon size={20}/></div><div><h3>{title}</h3><p>{detail}</p></div><button className="round-arrow" aria-label={`Open ${title}`} onClick={event => { event.stopPropagation(); id >= 100 ? onEdit({ id, title, detail, color, tasks }) : setToast('Copy this starter template to edit it') }}><ChevronRight size={17}/></button></article>)}</div><h2 className="subheading">Starter templates</h2><div className="template-row"><button onClick={() => { setSavedRoutines([...savedRoutines, { id: Date.now(), title: 'Gentle morning copy', detail: '3 tasks · 12 min', color: 'yellow', tasks: ['Drink a glass of water'] }]); setToast('Gentle morning copied') }}><Sun size={18}/><span>Gentle morning</span><Plus size={15}/></button><button onClick={() => { setSavedRoutines([...savedRoutines, { id: Date.now(), title: 'Basic skincare copy', detail: '2 tasks · 8 min', color: 'teal', tasks: ['Cleanse', 'Moisturize'] }]); setToast('Basic skincare copied') }}><Droplets size={18}/><span>Basic skincare</span><Plus size={15}/></button></div></>
}

function Timers({ timers, now, addTimer, updateTimer }: { timers: TimerItem[]; now: number; addTimer: (m: number, t?: string) => void; updateTimer: (t: TimerItem, a: 'pause' | 'restart' | 'delete') => void }) {
  return <><PageHeader eyebrow="KEEPING TIME, GENTLY" title="Timers" action={<button className="primary-btn" onClick={() => addTimer(10)}><Plus size={17}/> New timer</button>}/><div className="quick-timers"><span className="label">QUICK START</span><div>{[1, 5, 10, 15, 25].map(n => <button key={n} onClick={() => addTimer(n, `${n} minute pause`)}>{n}<small>min</small></button>)}</div></div>{timers.length === 0 ? <Empty icon={<Clock3 size={28}/>} title="No timers running" text="Start one when you need a little help staying present."/> : <div className="timer-grid">{timers.map(t => { const left = t.paused ? t.remaining : t.endsAt ? Math.max(0, Math.ceil((t.endsAt - now) / 1000)) : 0; return <article className={`timer-card ${t.color}`} key={t.id}><div className="timer-top"><span className="tag">ACTIVE</span><button className="more-btn" onClick={() => updateTimer(t, 'delete')}><X size={18}/></button></div><h2>{t.title}</h2><div className="timer-time">{Math.floor(left / 60).toString().padStart(2, '0')}:{(left % 60).toString().padStart(2, '0')}</div><div className="progress-bar dark"><i style={{ width: `${Math.min(100, Math.max(0, (1 - left / t.total) * 100))}%` }}/></div><div className="timer-controls"><button onClick={() => updateTimer(t, 'pause')}>{t.paused ? <Play size={16}/> : <Pause size={16}/>} {t.paused ? 'Resume' : 'Pause'}</button><button onClick={() => updateTimer(t, 'restart')}><RotateCcw size={16}/> Restart</button></div></article>})}</div>}<div className="notice"><Bell size={17}/><span>Timers use real elapsed time and continue accurately when you navigate away.</span></div></>
}

function Recipes({ recipes, addTimer, setToast, onAdd }: { recipes: Recipe[]; addTimer: (m: number, t?: string) => void; setToast: (message: string) => void; onAdd: (recipe: Recipe) => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All recipes')
  const filtered = recipes.filter(recipe => {
    const matchesText = `${recipe.title} ${recipe.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())
    const matchesFilter = filter === 'All recipes' || recipe.tags.some(tag => tag.toLowerCase().includes(filter.toLowerCase()))
    return matchesText && matchesFilter
  })
  const [showForm, setShowForm] = useState(false)
  return <><PageHeader eyebrow="FOOD THAT FEELS LIKE CARE" title="Recipes" action={<button className="icon-btn outlined" aria-label="Add recipe" onClick={() => setShowForm(true)}><Plus size={18}/></button>}/><label className="search-box">⌕ <input aria-label="Search recipes" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search your recipes" /></label><div className="filter-row">{['All recipes', 'Quick', 'Breakfast', 'Cozy'].map(option => <button key={option} className={filter === option ? 'filter active' : 'filter'} onClick={() => setFilter(option)}>{option}</button>)}</div>{filtered.length === 0 ? <Empty icon={<PixelCat mood="sleeping" />} title="No recipes found" text="Try another search or clear the filter."/> : <div className="recipe-grid">{filtered.map(r => <article className={`recipe-card ${r.color}`} key={r.title}><div className="recipe-art">{r.emoji}<button className="recipe-bookmark" aria-label={`Save ${r.title}`} onClick={() => setToast(`${r.title} saved to favourites`)}>♡</button></div><div className="recipe-content"><span className="label">{r.meta}</span><h3>{r.title}</h3><div className="recipe-tags">{r.tags.map(tag => <span key={tag}>#{tag}</span>)}</div><button className="mini-action" onClick={() => addTimer(10, `${r.title} timer`)}><Clock3 size={13}/> Cook with timer</button></div></article>)}</div>}{showForm && <RecipeForm onClose={() => setShowForm(false)} onSave={recipe => { onAdd(recipe); setShowForm(false) }} />}</>
}

function Library({ setToast }: { setToast: (s: string) => void }) {
  const items = [{ icon: Heart, title: 'Medications', text: 'Your reminders & history', color: 'pink' }, { icon: Droplets, title: 'Self-care', text: 'Products & procedures', color: 'teal' }, { icon: Flame, title: 'Progress', text: 'Patterns, not pressure', color: 'yellow' }, { icon: Settings, title: 'Appearance', text: 'Make softly yours', color: 'lavender' }]
  const handleExport = async () => {
    const url = URL.createObjectURL(await exportStoredData())
    const link = document.createElement('a'); link.href = url; link.download = `softly-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url); setToast('Backup downloaded')
  }
  const handleImport = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/json'
    input.onchange = async () => { const file = input.files?.[0]; if (!file) return; try { await importStoredData(file); setToast('Backup restored — reload to apply') } catch (error) { setToast(error instanceof Error ? error.message : 'Backup could not be restored') } }
    input.click()
  }
  return <><PageHeader eyebrow="YOUR LITTLE LIBRARY" title="Library" action={<button className="icon-btn outlined" aria-label="Library menu"><Menu size={18}/></button>}/><div className="library-grid">{items.map(({ icon: Icon, title, text, color }) => <button className={`library-card ${color}`} key={title} onClick={() => setToast(`${title} section opened`)}><div className="library-icon"><Icon size={19}/></div><div><h3>{title}</h3><p>{text}</p></div><ChevronRight size={17}/></button>)}</div><div className="privacy-card"><div className="privacy-icon">✦</div><div><h3>Your data stays yours.</h3><p>Softly stores your planner on this device. No account, no tracking, no pressure.</p></div></div><div className="settings-list"><button onClick={() => void handleExport()}><Archive size={17}/> Export your data <ChevronRight size={16}/></button><button onClick={handleImport}><ArrowRight size={17}/> Import a backup <ChevronRight size={16}/></button></div></>
}

function PageHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) { return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></div>{action}</div> }
function Empty({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="empty"><div>{icon}</div><h2>{title}</h2><p>{text}</p></div> }
function AddTask({ onAdd, onClose }: { onAdd: (s: string) => void; onClose: () => void }) { const [title, setTitle] = useState(''); return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e => e.stopPropagation()}><div className="modal-head"><div><span className="label">QUICK ADD</span><h2>What would feel good to do?</h2></div><button className="icon-btn" onClick={onClose}><X size={19}/></button></div><input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && title.trim() && onAdd(title.trim())} placeholder="e.g. Open the window" /><div className="modal-actions"><button className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={!title.trim()} onClick={() => onAdd(title.trim())}>Add task <ArrowRight size={16}/></button></div></div></div> }
function Profile({ onClose, onToast }: { onClose: () => void; onToast: (message: string) => void }) {
  const [name, setName] = useStored('softly-profile-name', 'Alex')
  const [theme, setTheme] = useStored('softly-theme', 'Pastel pink')
  useEffect(() => {
    const root = document.documentElement
    const themes: Record<string, [string, string, string]> = {
      'Pastel pink': ['#fff6f7', '#f5a3be', '#ed66b2'],
      'Lavender dream': ['#fbf8ff', '#d9c7ee', '#9c78ce'],
      'Mint & cream': ['#f5fffc', '#a8e8d8', '#4bb7a6'],
      Monochrome: ['#f5f5f5', '#d0d0d0', '#242024'],
    }
    const [background, primary, accent] = themes[theme] || themes['Pastel pink']
    root.style.setProperty('--bg', background); root.style.setProperty('--pink', primary); root.style.setProperty('--magenta', accent)
  }, [theme])
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal profile-modal" onMouseDown={event => event.stopPropagation()}><div className="modal-head"><div><span className="label">YOUR PROFILE</span><h2>Make softly yours</h2></div><button className="icon-btn" aria-label="Close profile" onClick={onClose}><X size={19}/></button></div><label className="form-label">Your name<input value={name} onChange={event => setName(event.target.value)} /></label><label className="form-label">Color mood<select value={theme} onChange={event => setTheme(event.target.value)}><option>Pastel pink</option><option>Lavender dream</option><option>Mint & cream</option><option>Monochrome</option></select></label><div className="profile-options"><button onClick={() => onToast('Daily reminders are enabled')}><Bell size={16}/> Daily reminders <span>ON</span></button><button onClick={() => onToast('Reduced motion preference saved')}><Sparkles size={16}/> Gentle motion <span>ON</span></button></div><div className="modal-actions"><button className="secondary-btn" onClick={onClose}>Close</button><button className="primary-btn" onClick={() => { onToast(`Saved profile for ${name || 'you'}`); onClose() }}>Save profile <Check size={16}/></button></div></div></div>
}

function TaskForm({ initial, onClose, onSave }: { initial: Task; onClose: () => void; onSave: (task: Task) => void }) {
  const [draft, setDraft] = useState(initial)
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={event => event.stopPropagation()}><div className="modal-head"><div><span className="label">EDIT TASK</span><h2>Adjust this small step.</h2></div><button className="icon-btn" aria-label="Close task form" onClick={onClose}><X size={19}/></button></div><label className="form-label">Task name<input value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })}/></label><label className="form-label">Category<input value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}/></label><label className="form-label">Minutes<input type="number" min="1" value={draft.duration} onChange={event => setDraft({ ...draft, duration: Math.max(1, Number(event.target.value) || 1) })}/></label><label className="form-label checkbox-label"><input type="checkbox" checked={draft.low} onChange={event => setDraft({ ...draft, low: event.target.checked })}/> Show on low-energy days</label><div className="modal-actions"><button className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={!draft.title.trim()} onClick={() => onSave({ ...draft, title: draft.title.trim() })}>Save task <Check size={16}/></button></div></div></div>
}

function RecipeForm({ onClose, onSave }: { onClose: () => void; onSave: (recipe: Recipe) => void }) {
  const [title, setTitle] = useState('')
  const [minutes, setMinutes] = useState('15')
  const [tag, setTag] = useState('quick')
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={event => event.stopPropagation()}><div className="modal-head"><div><span className="label">NEW RECIPE</span><h2>Add something you love.</h2></div><button className="icon-btn" aria-label="Close recipe form" onClick={onClose}><X size={19}/></button></div><label className="form-label">Recipe name<input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Tomato toast" /></label><label className="form-label">Cooking minutes<input type="number" min="1" value={minutes} onChange={event => setMinutes(event.target.value)} /></label><label className="form-label">Tag<input value={tag} onChange={event => setTag(event.target.value)} placeholder="quick, dinner, breakfast" /></label><div className="modal-actions"><button className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={!title.trim()} onClick={() => onSave({ title: title.trim(), meta: `${Math.max(1, Number(minutes) || 1)} min · personal`, emoji: '🍳', color: 'yellow', tags: [tag.trim() || 'personal'] })}>Save recipe <Check size={16}/></button></div></div></div>
}

function RoutineForm({ initial, onClose, onSave }: { initial?: Routine; onClose: () => void; onSave: (routine: Routine) => void }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.detail || '')
  const [taskText, setTaskText] = useState('')
  const [tasks, setTasks] = useState<string[]>(initial?.tasks || [])
  const valid = title.trim().length > 1
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={event => event.stopPropagation()}><div className="modal-head"><div><span className="label">{initial ? 'EDIT ROUTINE' : 'NEW ROUTINE'}</span><h2>Build a rhythm that fits you.</h2></div><button className="icon-btn" aria-label="Close routine form" onClick={onClose}><X size={19}/></button></div><label className="form-label">Routine name<input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Sunday reset" /></label><label className="form-label">Description<input value={description} onChange={event => setDescription(event.target.value)} placeholder="What does this routine help with?" /></label><div className="form-label">Tasks<button className="inline-add" onClick={() => { if (taskText.trim()) { setTasks([...tasks, taskText.trim()]); setTaskText('') } }}><Plus size={14}/> Add task</button><input value={taskText} onChange={event => setTaskText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && taskText.trim()) { setTasks([...tasks, taskText.trim()]); setTaskText('') } }} placeholder="Add a step, then press Enter" />{tasks.length > 0 && <ul className="form-task-list">{tasks.map((task, index) => <li key={`${task}-${index}`}>{task}<button aria-label={`Remove ${task}`} onClick={() => setTasks(tasks.filter((_, itemIndex) => itemIndex !== index))}><X size={13}/></button></li>)}</ul>}</div><div className="modal-actions"><button className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={!valid} onClick={() => onSave({ id: initial?.id || Date.now(), title: title.trim(), detail: description || `${tasks.length} tasks · ${Math.max(5, tasks.length * 8)} min`, color: initial?.color || 'lavender', tasks })}>{initial ? 'Save routine' : 'Create routine'} <ArrowRight size={16}/></button></div></div></div>
}

export default App

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
