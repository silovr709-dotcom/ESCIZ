import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  AlignHorizontalSpaceAround, AlignVerticalSpaceAround, ArrowLeft, ChevronDown, Copy, Download, ExternalLink,
  FilePlus2, FolderOpen, GalleryVerticalEnd, Grip, Image as ImageIcon, Link2, Maximize2, MessageSquareText,
  MonitorUp, MousePointer2, PackagePlus, Ruler, Redo2, Save, Settings2, Trash2, Undo2, Upload, ZoomIn, ZoomOut
} from 'lucide-react'
import SketchObjectView from './SketchObjectView'
import { deleteProject, listProjects, loadProject, saveProject } from './storage'
import { exportPdf, exportPng } from './export'
import type { EquipmentType, ProjectSummary, SketchObject, SketchProject, Tool } from './types'
import { todayRu, uid } from './types'

const COLORS = { ink: '#20242b', accent: '#ff5c35', blue: '#2563eb' }
const equipmentTypes: EquipmentType[] = ['Холодильник', 'Духовой шкаф', 'СВЧ', 'ПММ', 'Варочная панель', 'Вытяжка', 'Стиральная машина', 'Мойка', 'Другое']
const toolItems: { id: Tool; label: string; icon: typeof MousePointer2; key?: string }[] = [
  { id: 'select', label: 'Курсор', icon: MousePointer2, key: 'V' },
  { id: 'free-dimension', label: 'Свободный размер', icon: Ruler, key: 'R' },
  { id: 'h-dimension', label: 'Горизонтальный размер', icon: AlignHorizontalSpaceAround, key: 'H' },
  { id: 'v-dimension', label: 'Вертикальный размер', icon: AlignVerticalSpaceAround, key: 'J' },
  { id: 'chain', label: 'Цепочка размеров', icon: GalleryVerticalEnd, key: 'C' },
  { id: 'module', label: 'Модуль', icon: PackagePlus, key: 'M' },
  { id: 'callout', label: 'Выноска', icon: Grip, key: 'L' },
  { id: 'comment', label: 'Комментарий', icon: MessageSquareText, key: 'T' },
  { id: 'equipment', label: 'Техника', icon: MonitorUp, key: 'E' },
  { id: 'link', label: 'Ссылка', icon: Link2, key: 'K' },
]

type Drag = { mode: 'create' | 'move' | 'handle'; start: { x: number; y: number }; id?: string; end?: 'start' | 'end'; before: SketchProject; original?: SketchObject }

function readImage(file: File): Promise<{ dataUrl: string; width: number; height: number; name: string }> {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return reject(new Error('Поддерживаются JPG, PNG и WEBP'))
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('Файл не является корректным изображением'))
      image.onload = () => resolve({ dataUrl: String(reader.result), width: image.naturalWidth, height: image.naturalHeight, name: file.name })
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

function snapAngle(start: { x: number; y: number }, end: { x: number; y: number }, step = 45) {
  const distance = Math.hypot(end.x - start.x, end.y - start.y)
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  const snapped = Math.round(angle / (step * Math.PI / 180)) * step * Math.PI / 180
  return { x: start.x + Math.cos(snapped) * distance, y: start.y + Math.sin(snapped) * distance }
}

function createProject(image: SketchProject['image']): SketchProject {
  const now = new Date().toISOString()
  return { version: 1, id: uid(), title: `Эскиз ${todayRu()}`, createdAt: now, updatedAt: now, image, objects: [], header: { enabled: true, project: '', room: 'Кухня', date: todayRu(), variant: '01' }, integration: {} }
}

export default function App() {
  const [project, setProject] = useState<SketchProject | null>(null)
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(() => listProjects().then(setProjects).catch(() => setProjects([])), [])
  useEffect(() => { refresh() }, [refresh])

  const openFile = async (file?: File) => {
    if (!file) return
    setLoading(true); setError('')
    try { setProject(createProject(await readImage(file))) } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка загрузки') }
    finally { setLoading(false) }
  }

  if (!project) return <StartScreen projects={projects} loading={loading} error={error} onUpload={openFile} onOpen={async id => { const p = await loadProject(id); if (p) setProject(p) }} onDelete={async id => { await deleteProject(id); refresh() }} />
  return <Editor initialProject={project} onClose={() => { setProject(null); refresh() }} />
}

function StartScreen({ projects, loading, error, onUpload, onOpen, onDelete }: { projects: ProjectSummary[]; loading: boolean; error: string; onUpload: (f?: File) => void; onOpen: (id: string) => void; onDelete: (id: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  return <main className="start-screen">
    <header className="brand"><div className="brand-mark">Р</div><div><strong>РЕцепт</strong><span>Эскиз PRO</span></div></header>
    <section className="start-content">
      <div className="start-copy"><span className="eyebrow">ТЕХНИЧЕСКИЙ ЭСКИЗ БЕЗ ЛИШНИХ ШАГОВ</span><h1>Скрин проекта.<br/><em>Размеры. Готово.</em></h1><p>Загрузите изображение из PRO100 и оформите понятный технический эскиз прямо поверх него.</p></div>
      <button className={`upload-card ${drag ? 'dragging' : ''}`} onClick={() => input.current?.click()} onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); onUpload(e.dataTransfer.files[0]) }}>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => onUpload(e.target.files?.[0])}/>
        <span className="upload-icon">{loading ? <span className="spinner"/> : <Upload/>}</span>
        <strong>{loading ? 'Загружаем…' : 'Загрузить скрин проекта'}</strong><span>или перетащите JPG, PNG, WEBP сюда</span>
      </button>
      {error && <div className="error-toast">{error}</div>}
      {projects.length > 0 && <section className="recent"><div className="section-title"><h2>Недавние эскизы</h2><span>{projects.length}</span></div><div className="project-grid">
        {projects.map(p => <article className="project-card" key={p.id} onClick={() => onOpen(p.id)}>
          <div className="project-thumb" style={{ backgroundImage: `url(${p.thumbnail})` }}><button title="Удалить" onClick={e => { e.stopPropagation(); if (confirm('Удалить эскиз?')) onDelete(p.id) }}><Trash2 size={16}/></button></div>
          <div><strong>{p.title}</strong><span>Изменён {new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(p.updatedAt))}</span></div>
        </article>)}
      </div></section>}
    </section>
  </main>
}

function Editor({ initialProject, onClose }: { initialProject: SketchProject; onClose: () => void }) {
  const [project, setProject] = useState(initialProject)
  const [tool, setTool] = useState<Tool>('select')
  const [selected, setSelected] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [showImage, setShowImage] = useState(true)
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [saved, setSaved] = useState(true)
  const [exportOpen, setExportOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [chainLast, setChainLast] = useState<{ x: number; y: number } | null>(null)
  const [draftLine, setDraftLine] = useState<{ start: { x: number; y: number }; end: { x: number; y: number }; callout: boolean } | null>(null)
  const [spaceDown, setSpaceDown] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const past = useRef<SketchProject[]>([]), future = useRef<SketchProject[]>([])
  const chosen = project.objects.find(o => o.id === selected)

  const commit = useCallback((fn: (p: SketchProject) => SketchProject) => {
    setProject(current => { past.current.push(current); if (past.current.length > 80) past.current.shift(); future.current = []; setSaved(false); return fn(current) })
  }, [])
  const changeObject = (id: string, patch: Partial<SketchObject>) => commit(p => ({ ...p, objects: p.objects.map(o => o.id === id ? { ...o, ...patch } as SketchObject : o) }))
  const undo = useCallback(() => setProject(current => { const prev = past.current.pop(); if (!prev) return current; future.current.push(current); setSaved(false); return prev }), [])
  const redo = useCallback(() => setProject(current => { const next = future.current.pop(); if (!next) return current; past.current.push(current); setSaved(false); return next }), [])
  const save = useCallback(async () => { const next = { ...project, updatedAt: new Date().toISOString() }; setProject(next); await saveProject(next); setSaved(true) }, [project])

  useEffect(() => { if (saved) return; const timer = setTimeout(() => { save() }, 1600); return () => clearTimeout(timer) }, [saved, save])

  const deleteSelected = useCallback(() => { if (!selected) return; commit(p => ({ ...p, objects: p.objects.filter(o => o.id !== selected) })); setSelected(null) }, [selected, commit])
  const duplicate = useCallback(() => { if (!chosen) return; const copy = { ...chosen, id: uid(), x: chosen.x + 24, y: chosen.y + 24 } as SketchObject; if (copy.type === 'dimension') { copy.x2 += 24; copy.y2 += 24 } if (copy.type === 'callout') { copy.targetX += 24; copy.targetY += 24 } commit(p => ({ ...p, objects: [...p.objects, copy] })); setSelected(copy.id) }, [chosen, commit])
  const nudgeSelected = useCallback((dx: number, dy: number) => {
    if (!selected) return
    commit(p => ({ ...p, objects: p.objects.map(o => {
      if (o.id !== selected) return o
      const moved = { ...o, x: o.x + dx, y: o.y + dy } as SketchObject
      if (moved.type === 'dimension') { moved.x2 += dx; moved.y2 += dy }
      if (moved.type === 'callout') { moved.targetX += dx; moved.targetY += dy }
      return moved
    }) }))
  }, [selected, commit])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const input = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)
      if (e.code === 'Space' && !input) { e.preventDefault(); setSpaceDown(true) }
      if (input) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicate(); return }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return }
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected()
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && selected) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        nudgeSelected(e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0, e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0)
      }
      if (e.key === 'Escape') { setTool('select'); setSelected(null); setChainLast(null) }
      const found = toolItems.find(t => t.key?.toLowerCase() === e.key.toLowerCase())
      if (found && !e.ctrlKey && !e.metaKey) { setTool(found.id); if (found.id !== 'chain') setChainLast(null) }
    }
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceDown(false) }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [deleteSelected, duplicate, nudgeSelected, redo, save, selected, undo])

  const point = (e: ReactPointerEvent) => { const r = svgRef.current!.getBoundingClientRect(); return { x: (e.clientX - r.left) * project.image.width / r.width, y: (e.clientY - r.top) * project.image.height / r.height } }
  const moduleNumber = () => `М${String(project.objects.filter(o => o.type === 'module').length + 1).padStart(2, '0')}`
  const addAt = (type: Tool, p: { x: number; y: number }) => {
    const base = { id: uid(), x: p.x, y: p.y, color: COLORS.ink, fontSize: 22 }
    let object: SketchObject
    if (type === 'module') object = { ...base, type: 'module', number: moduleNumber(), description: '' }
    else if (type === 'comment') object = { ...base, type: 'comment', text: 'Новый комментарий' }
    else if (type === 'equipment') object = { ...base, type: 'equipment', text: 'ПММ 600', equipmentType: 'ПММ', color: COLORS.blue }
    else object = { ...base, type: 'link', text: 'Название ссылки', url: 'https://' }
    commit(old => ({ ...old, objects: [...old.objects, object] })); setSelected(object.id); setTool('select')
  }

  const onStageDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (spaceDown || e.button === 1) return
    if (e.target !== e.currentTarget && (e.target as Element).tagName !== 'image') return
    const p = point(e)
    if (tool === 'select') { setSelected(null); return }
    if (['module', 'comment', 'equipment', 'link'].includes(tool)) { addAt(tool, p); return }
    if (tool === 'chain') {
      if (!chainLast) { setChainLast(p); return }
      const horizontal = Math.abs(p.x - chainLast.x) >= Math.abs(p.y - chainLast.y)
      const end = horizontal ? { x: p.x, y: chainLast.y } : { x: chainLast.x, y: p.y }
      const o: SketchObject = { id: uid(), type: 'dimension', orientation: horizontal ? 'horizontal' : 'vertical', x: chainLast.x, y: chainLast.y, x2: end.x, y2: end.y, value: '600', color: COLORS.ink, fontSize: 22, lineWidth: 2 }
      commit(old => ({ ...old, objects: [...old.objects, o] })); setSelected(o.id); setChainLast(end); return
    }
    dragRef.current = { mode: 'create', start: p, before: project }
    setDraftLine({ start: p, end: p, callout: tool === 'callout' })
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }

  const onStageMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const d = dragRef.current
    if (!d) return
    let p = point(e)
    if (d.mode === 'create') {
      if (tool === 'free-dimension' && e.shiftKey) p = snapAngle(d.start, p)
      if (tool === 'h-dimension') p.y = d.start.y
      if (tool === 'v-dimension') p.x = d.start.x
      setDraftLine({ start: d.start, end: p, callout: tool === 'callout' })
      return
    }
    if (d.mode === 'handle' && d.original?.type === 'dimension' && d.original.orientation === 'free' && e.shiftKey) {
      const anchor = d.end === 'start' ? { x: d.original.x2, y: d.original.y2 } : { x: d.original.x, y: d.original.y }
      p = snapAngle(anchor, p)
    }
    const dx = p.x - d.start.x, dy = p.y - d.start.y
    setProject(current => ({ ...current, objects: current.objects.map(o => {
      if (o.id !== d.id || !d.original) return o
      const orig = d.original
      if (d.mode === 'handle') {
        if (orig.type === 'dimension') return d.end === 'start'
          ? { ...orig, x: orig.orientation === 'vertical' ? orig.x : p.x, y: orig.orientation === 'horizontal' ? orig.y : p.y }
          : { ...orig, x2: orig.orientation === 'vertical' ? orig.x2 : p.x, y2: orig.orientation === 'horizontal' ? orig.y2 : p.y }
        if (orig.type === 'callout') return { ...orig, targetX: p.x, targetY: p.y }
      }
      const moved = { ...orig, x: orig.x + dx, y: orig.y + dy } as SketchObject
      if (moved.type === 'dimension') { moved.x2 += dx; moved.y2 += dy }
      if (moved.type === 'callout') { moved.targetX += dx; moved.targetY += dy }
      return moved
    }) }))
  }

  const onStageUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    const d = dragRef.current
    if (!d) return
    let p = point(e)
    if (d.mode === 'create') {
      const horizontal = tool === 'h-dimension'
      const vertical = tool === 'v-dimension'
      const isFree = tool === 'free-dimension'
      const isCallout = tool === 'callout'
      if (isFree && e.shiftKey) p = snapAngle(d.start, p)
      const distance = Math.hypot(p.x - d.start.x, p.y - d.start.y)
      if (distance > 8) {
        let o: SketchObject
        if (isCallout) o = { id: uid(), type: 'callout', targetX: d.start.x, targetY: d.start.y, x: p.x, y: p.y, text: 'Текст выноски', color: COLORS.ink, fontSize: 22 }
        else o = { id: uid(), type: 'dimension', orientation: isFree ? 'free' : horizontal ? 'horizontal' : 'vertical', textOrientation: 'parallel', x: d.start.x, y: d.start.y, x2: vertical ? d.start.x : p.x, y2: horizontal ? d.start.y : p.y, value: '600', color: COLORS.ink, fontSize: 22, lineWidth: 2 }
        past.current.push(d.before); future.current = []; setProject(old => ({ ...old, objects: [...old.objects, o] })); setSelected(o.id); setSaved(false); setTool('select')
      }
    } else { past.current.push(d.before); future.current = []; setSaved(false) }
    dragRef.current = null
    setDraftLine(null)
  }

  const objectDown = (e: ReactPointerEvent<SVGGElement>, o: SketchObject) => {
    e.stopPropagation(); setSelected(o.id)
    if (tool !== 'select') return
    const p = point(e); dragRef.current = { mode: 'move', start: p, id: o.id, before: project, original: o }; svgRef.current?.setPointerCapture(e.pointerId)
  }
  const handleDown = (e: ReactPointerEvent<SVGCircleElement>, end: 'start' | 'end') => {
    e.stopPropagation(); if (!chosen) return
    dragRef.current = { mode: 'handle', start: point(e), id: chosen.id, before: project, original: chosen, end }; svgRef.current?.setPointerCapture(e.pointerId)
  }

  const fit = () => { const v = viewportRef.current; if (!v) return; setZoom(Math.min((v.clientWidth - 100) / project.image.width, (v.clientHeight - 100) / project.image.height, 1.2)) }
  useEffect(() => { const t = setTimeout(fit, 50); return () => clearTimeout(t) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setActiveTool = (id: Tool) => { setTool(id); if (id !== 'chain') setChainLast(null) }
  const titleUpdate = (title: string) => { setProject(p => ({ ...p, title })); setSaved(false) }

  return <div className="editor-shell">
    <header className="app-header">
      <div className="header-left"><button className="icon-btn" title="К проектам" onClick={async () => { await save(); onClose() }}><ArrowLeft/></button><div className="mini-brand"><div className="brand-mark small">Р</div><span>Эскиз <b>PRO</b></span></div><div className="separator"/><input className="title-input" value={project.title} onChange={e => titleUpdate(e.target.value)}/><span className={`save-state ${saved ? 'ok' : ''}`}>{saved ? 'Сохранено' : 'Сохраняем…'}</span></div>
      <div className="header-actions"><button className="icon-btn" title="Отменить (Ctrl+Z)" disabled={!past.current.length} onClick={undo}><Undo2/></button><button className="icon-btn" title="Повторить (Ctrl+Shift+Z)" disabled={!future.current.length} onClick={redo}><Redo2/></button><button className="secondary-btn" onClick={save}><Save/>Сохранить</button><div className="export-wrap"><button className="primary-btn" onClick={() => setExportOpen(!exportOpen)}><Download/>Экспорт<ChevronDown size={15}/></button>{exportOpen && <div className="export-menu"><button onClick={async () => { if (svgRef.current) await exportPng(project, svgRef.current); setExportOpen(false) }}><ImageIcon/>PNG <span>изображение</span></button><button onClick={async () => { if (svgRef.current) await exportPdf(project, svgRef.current); setExportOpen(false) }}><FilePlus2/>PDF <span>с активными ссылками</span></button></div>}</div></div>
    </header>
    <nav className="tool-strip">{toolItems.map(({ id, label, icon: Icon, key }) => <button key={id} className={tool === id ? 'active' : ''} title={`${label}${key ? ` (${key})` : ''}`} onClick={() => setActiveTool(id)}><Icon/><span>{label.replace('Горизонтальный ', '').replace('Вертикальный ', '')}</span>{key && <kbd>{key}</kbd>}</button>)}<div className="toolbar-spacer"/><button className={sidebarOpen ? 'active subtle' : 'subtle'} onClick={() => setSidebarOpen(!sidebarOpen)}><Settings2/><span>Свойства</span></button></nav>
    <div className="work-area">
      <section ref={viewportRef} className={`canvas-viewport ${spaceDown ? 'panning' : ''}`} onWheel={e => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(z => Math.max(.1, Math.min(3, z * (e.deltaY > 0 ? .9 : 1.1)))) } }} onPointerDown={e => { if (!spaceDown && e.button !== 1) return; const v = viewportRef.current!; panRef.current = { x: e.clientX, y: e.clientY, left: v.scrollLeft, top: v.scrollTop }; v.setPointerCapture(e.pointerId) }} onPointerMove={e => { const pan = panRef.current; if (!pan) return; const v = viewportRef.current!; v.scrollLeft = pan.left - (e.clientX - pan.x); v.scrollTop = pan.top - (e.clientY - pan.y) }} onPointerUp={() => { panRef.current = null }}>
        {project.header.enabled && <div className="canvas-header-preview" style={{ width: project.image.width * zoom }}><strong>РЕцепт <i>/</i> Эскиз PRO</strong><span>Проект: {project.header.project || '—'}</span><small>Помещение: {project.header.room || '—'} · Дата: {project.header.date} · Вариант: {project.header.variant}</small></div>}
        <div className="stage" style={{ width: project.image.width * zoom, height: project.image.height * zoom }}>
          <svg ref={svgRef} viewBox={`0 0 ${project.image.width} ${project.image.height}`} width="100%" height="100%" className={`drawing-surface tool-${tool}`} onPointerDown={onStageDown} onPointerMove={onStageMove} onPointerUp={onStageUp}>
            <defs><marker id="dimArrow" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M 8 1 L 1 4.5 L 8 8" fill="none" stroke={COLORS.ink} strokeWidth="1.5"/></marker></defs>
            {showImage && <image href={project.image.dataUrl} x="0" y="0" width={project.image.width} height={project.image.height} preserveAspectRatio="none" pointerEvents="none"/>}
            {showAnnotations && project.objects.map(o => <SketchObjectView key={o.id} object={o} selected={o.id === selected} onPointerDown={objectDown} onHandleDown={handleDown}/>)}
            {draftLine && <g pointerEvents="none" opacity=".9">
              <line x1={draftLine.start.x} y1={draftLine.start.y} x2={draftLine.end.x} y2={draftLine.end.y} stroke={COLORS.accent} strokeWidth="3" strokeDasharray="10 7"/>
              <circle cx={draftLine.start.x} cy={draftLine.start.y} r="6" fill={COLORS.accent}/><circle cx={draftLine.end.x} cy={draftLine.end.y} r="6" fill={COLORS.accent}/>
            </g>}
            {tool === 'chain' && chainLast && <g pointerEvents="none"><circle cx={chainLast.x} cy={chainLast.y} r="8" fill={COLORS.accent}/><circle cx={chainLast.x} cy={chainLast.y} r="16" fill="none" stroke={COLORS.accent} opacity=".35"/></g>}
          </svg>
        </div>
        {tool === 'chain' && <div className="chain-hint">Укажите следующую точку · Esc — закончить</div>}
      </section>
      {sidebarOpen && <Inspector project={project} object={chosen} showImage={showImage} showAnnotations={showAnnotations} onShowImage={setShowImage} onShowAnnotations={setShowAnnotations} onProject={patch => commit(p => ({ ...p, ...patch }))} onObject={(patch) => chosen && changeObject(chosen.id, patch)} onDelete={deleteSelected} onDuplicate={duplicate}/>} 
    </div>
    <footer className="status-bar"><span><span className="status-dot"/> {project.image.name} · {project.image.width} × {project.image.height}px</span><span className="status-tip">Стрелки — точный сдвиг · Shift — привязка угла · Пробел — перемещение</span><div className="zoom-control"><button onClick={() => setZoom(z => Math.max(.1, z - .1))}><ZoomOut/></button><button className="zoom-value" onClick={fit}>{Math.round(zoom * 100)}%</button><button onClick={() => setZoom(z => Math.min(3, z + .1))}><ZoomIn/></button><button title="По размеру экрана" onClick={fit}><Maximize2/></button></div></footer>
  </div>
}

function Inspector({ project, object, showImage, showAnnotations, onShowImage, onShowAnnotations, onProject, onObject, onDelete, onDuplicate }: { project: SketchProject; object?: SketchObject; showImage: boolean; showAnnotations: boolean; onShowImage: (v: boolean) => void; onShowAnnotations: (v: boolean) => void; onProject: (p: Partial<SketchProject>) => void; onObject: (p: Partial<SketchObject>) => void; onDelete: () => void; onDuplicate: () => void }) {
  const [tab, setTab] = useState<'object' | 'document'>(object ? 'object' : 'document')
  useEffect(() => { if (object) setTab('object') }, [object?.id])
  return <aside className="inspector">
    <div className="inspector-tabs"><button className={tab === 'object' ? 'active' : ''} onClick={() => setTab('object')}>Объект</button><button className={tab === 'document' ? 'active' : ''} onClick={() => setTab('document')}>Документ</button></div>
    {tab === 'object' ? object ? <ObjectFields object={object} onObject={onObject}/> : <div className="empty-inspector"><MousePointer2/><strong>Ничего не выбрано</strong><span>Выберите объект на эскизе, чтобы изменить его параметры.</span></div> : <DocumentFields project={project} showImage={showImage} showAnnotations={showAnnotations} onShowImage={onShowImage} onShowAnnotations={onShowAnnotations} onProject={onProject}/>} 
    {tab === 'object' && object && <div className="inspector-bottom"><button onClick={onDuplicate}><Copy/>Дублировать <kbd>⌘D</kbd></button><button className="danger" onClick={onDelete}><Trash2/>Удалить</button></div>}
  </aside>
}

function ObjectFields({ object: o, onObject }: { object: SketchObject; onObject: (p: Partial<SketchObject>) => void }) {
  const title = o.type === 'dimension' ? 'Размерная линия' : o.type === 'module' ? 'Модуль' : o.type === 'callout' ? 'Выноска' : o.type === 'equipment' ? 'Техника' : o.type === 'link' ? 'Ссылка' : 'Комментарий'
  return <div className="fields"><div className="fields-heading"><span>{title}</span><small>#{o.id.slice(0, 5)}</small></div>
    {o.type === 'dimension' && <><label>Значение, мм<input autoFocus value={o.value} onChange={e => onObject({ value: e.target.value } as Partial<SketchObject>)}/></label><label>Ориентация<select value={o.orientation} onChange={e => { const orientation = e.target.value; onObject({ orientation, ...(orientation === 'horizontal' ? { y2: o.y } : orientation === 'vertical' ? { x2: o.x } : {}) } as Partial<SketchObject>) }}><option value="free">Свободная</option><option value="horizontal">Горизонтальная</option><option value="vertical">Вертикальная</option></select></label><label>Положение текста<select value={o.textOrientation ?? 'parallel'} onChange={e => onObject({ textOrientation: e.target.value } as Partial<SketchObject>)}><option value="parallel">Параллельно линии</option><option value="horizontal">Всегда горизонтально</option></select></label><label>Толщина линии<div className="range-row"><input type="range" min="1" max="6" step=".5" value={o.lineWidth} onChange={e => onObject({ lineWidth: +e.target.value } as Partial<SketchObject>)}/><span>{o.lineWidth}px</span></div></label></>}
    {o.type === 'module' && <><label>Номер модуля<input autoFocus value={o.number} onChange={e => onObject({ number: e.target.value } as Partial<SketchObject>)}/></label><label>Описание<textarea rows={4} placeholder={'600\nНиз'} value={o.description} onChange={e => onObject({ description: e.target.value } as Partial<SketchObject>)}/></label></>}
    {(o.type === 'comment' || o.type === 'callout') && <label>Текст<textarea autoFocus rows={5} value={o.text} onChange={e => onObject({ text: e.target.value } as Partial<SketchObject>)}/></label>}
    {o.type === 'equipment' && <><label>Тип техники<select value={o.equipmentType} onChange={e => onObject({ equipmentType: e.target.value, text: e.target.value } as Partial<SketchObject>)}>{equipmentTypes.map(t => <option key={t}>{t}</option>)}</select></label><label>Подпись<input autoFocus value={o.text} onChange={e => onObject({ text: e.target.value } as Partial<SketchObject>)}/></label><label>Ссылка на модель<input type="url" placeholder="https://…" value={o.url || ''} onChange={e => onObject({ url: e.target.value } as Partial<SketchObject>)}/></label></>}
    {o.type === 'link' && <><label>Название<input autoFocus value={o.text} onChange={e => onObject({ text: e.target.value } as Partial<SketchObject>)}/></label><label>URL<input type="url" placeholder="https://…" value={o.url || ''} onChange={e => onObject({ url: e.target.value } as Partial<SketchObject>)}/></label>{o.url && <a className="test-link" href={o.url} target="_blank" rel="noreferrer"><ExternalLink/>Открыть ссылку</a>}</>}
    <div className="section-label">Положение</div><div className="field-row"><label>X<input type="number" value={Math.round(o.x)} onChange={e => onObject({ x: +e.target.value } as Partial<SketchObject>)}/></label><label>Y<input type="number" value={Math.round(o.y)} onChange={e => onObject({ y: +e.target.value } as Partial<SketchObject>)}/></label></div>
    {o.type === 'dimension' && <div className="field-row"><label>Конец X<input type="number" value={Math.round(o.x2)} onChange={e => onObject({ x2: +e.target.value } as Partial<SketchObject>)}/></label><label>Конец Y<input type="number" value={Math.round(o.y2)} onChange={e => onObject({ y2: +e.target.value } as Partial<SketchObject>)}/></label></div>}
    <div className="field-row"><label>Цвет<input className="color-input" type="color" value={o.color} onChange={e => onObject({ color: e.target.value } as Partial<SketchObject>)}/></label><label>Размер текста<input type="number" min="12" max="64" value={o.fontSize} onChange={e => onObject({ fontSize: +e.target.value } as Partial<SketchObject>)}/></label></div>
    <div className="helper-card"><b>Быстрое редактирование</b><span>Перетащите объект, чтобы переместить. Синие маркеры меняют край линии.</span></div>
  </div>
}

function DocumentFields({ project, showImage, showAnnotations, onShowImage, onShowAnnotations, onProject }: { project: SketchProject; showImage: boolean; showAnnotations: boolean; onShowImage: (v: boolean) => void; onShowAnnotations: (v: boolean) => void; onProject: (p: Partial<SketchProject>) => void }) {
  const h = project.header
  const updateHeader = (patch: Partial<typeof h>) => onProject({ header: { ...h, ...patch } })
  return <div className="fields"><div className="fields-heading"><span>Документ</span></div><div className="section-label">Слои</div><label className="toggle-row"><ImageIcon/>Изображение<input type="checkbox" checked={showImage} onChange={e => onShowImage(e.target.checked)}/><i/></label><label className="toggle-row"><MessageSquareText/>Аннотации <small>{project.objects.length}</small><input type="checkbox" checked={showAnnotations} onChange={e => onShowAnnotations(e.target.checked)}/><i/></label><div className="section-label">Информационная шапка</div><label className="toggle-row">Показывать шапку<input type="checkbox" checked={h.enabled} onChange={e => updateHeader({ enabled: e.target.checked })}/><i/></label>{h.enabled && <><label>Проект<input value={h.project} placeholder="Ивановы" onChange={e => updateHeader({ project: e.target.value })}/></label><label>Помещение<input value={h.room} onChange={e => updateHeader({ room: e.target.value })}/></label><div className="field-row"><label>Дата<input value={h.date} onChange={e => updateHeader({ date: e.target.value })}/></label><label>Вариант<input value={h.variant} onChange={e => updateHeader({ variant: e.target.value })}/></label></div></>}</div>
}
