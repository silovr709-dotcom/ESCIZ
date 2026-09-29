import type { PointerEvent as ReactPointerEvent } from 'react'
import { ExternalLink } from 'lucide-react'
import type { SketchObject } from './types'

type Props = {
  object: SketchObject
  selected: boolean
  onPointerDown: (e: ReactPointerEvent<SVGGElement>, object: SketchObject) => void
  onHandleDown: (e: ReactPointerEvent<SVGCircleElement>, end: 'start' | 'end') => void
}

export default function SketchObjectView({ object: o, selected, onPointerDown, onHandleDown }: Props) {
  const common = { stroke: o.color, fill: o.color }
  if (o.type === 'dimension') {
    const horizontal = o.orientation === 'horizontal'
    const x1 = o.x, y1 = o.y, x2 = o.x2, y2 = o.y2
    const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2
    const label = `${o.value || '—'} мм`
    const approxWidth = Math.max(68, label.length * o.fontSize * .62)
    const tick = 9
    return <g className={`sketch-object ${selected ? 'selected' : ''}`} onPointerDown={e => onPointerDown(e, o)}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={o.color} strokeWidth={o.lineWidth} markerStart="url(#dimArrow)" markerEnd="url(#dimArrow)" />
      {horizontal ? <>
        <line x1={x1} y1={y1 - tick} x2={x1} y2={y1 + tick} stroke={o.color} strokeWidth={o.lineWidth}/>
        <line x1={x2} y1={y2 - tick} x2={x2} y2={y2 + tick} stroke={o.color} strokeWidth={o.lineWidth}/>
      </> : <>
        <line x1={x1 - tick} y1={y1} x2={x1 + tick} y2={y1} stroke={o.color} strokeWidth={o.lineWidth}/>
        <line x1={x2 - tick} y1={y2} x2={x2 + tick} y2={y2} stroke={o.color} strokeWidth={o.lineWidth}/>
      </>}
      <g transform={horizontal ? `translate(${midX} ${midY})` : `translate(${midX} ${midY}) rotate(-90)`}>
        <rect x={-approxWidth / 2} y={-o.fontSize * .72} width={approxWidth} height={o.fontSize * 1.25} rx="3" fill="white" opacity=".92"/>
        <text textAnchor="middle" dominantBaseline="middle" fontSize={o.fontSize} fontWeight="700" fill={o.color}>{label}</text>
      </g>
      {selected && <>
        <circle className="object-handle" cx={x1} cy={y1} r="7" onPointerDown={e => onHandleDown(e, 'start')}/>
        <circle className="object-handle" cx={x2} cy={y2} r="7" onPointerDown={e => onHandleDown(e, 'end')}/>
      </>}
    </g>
  }

  if (o.type === 'module') {
    const lines = [o.number, ...o.description.split('\n').filter(Boolean)]
    const width = Math.max(72, ...lines.map(t => t.length * o.fontSize * .6)) + 22
    const height = lines.length * (o.fontSize + 5) + 14
    return <g className={`sketch-object label-object ${selected ? 'selected' : ''}`} transform={`translate(${o.x} ${o.y})`} onPointerDown={e => onPointerDown(e, o)}>
      <rect x="0" y="0" width={width} height={height} rx="6" fill="white" stroke={o.color} strokeWidth="2"/>
      {lines.map((line, i) => <text key={i} x={width / 2} y={12 + i * (o.fontSize + 5)} dominantBaseline="hanging" textAnchor="middle" fontSize={o.fontSize} fontWeight={i === 0 ? 800 : 500} fill={o.color}>{line}</text>)}
    </g>
  }

  if (o.type === 'callout') {
    const lines = o.text.split('\n')
    const width = Math.max(120, ...lines.map(t => t.length * o.fontSize * .56)) + 24
    const height = Math.max(48, lines.length * (o.fontSize + 5) + 18)
    const elbowX = o.x > o.targetX ? o.x - 18 : o.x + width + 18
    return <g className={`sketch-object label-object ${selected ? 'selected' : ''}`} onPointerDown={e => onPointerDown(e, o)}>
      <polyline points={`${o.targetX},${o.targetY} ${elbowX},${o.y + height / 2} ${o.x > o.targetX ? o.x : o.x + width},${o.y + height / 2}`} fill="none" stroke={o.color} strokeWidth="2"/>
      <circle cx={o.targetX} cy={o.targetY} r="5" fill={o.color}/>
      <rect x={o.x} y={o.y} width={width} height={height} rx="6" fill="#fff" stroke={o.color} strokeWidth="2"/>
      {lines.map((line, i) => <text key={i} x={o.x + 12} y={o.y + 11 + i * (o.fontSize + 5)} dominantBaseline="hanging" fontSize={o.fontSize} fontWeight="600" fill={o.color}>{line}</text>)}
      {selected && <circle className="object-handle" cx={o.targetX} cy={o.targetY} r="7" onPointerDown={e => onHandleDown(e, 'start')}/>} 
    </g>
  }

  const isComment = o.type === 'comment'
  const isLink = o.type === 'link'
  const lines = o.text.split('\n')
  const width = Math.max(isComment ? 160 : 100, ...lines.map(t => t.length * o.fontSize * .56)) + 28
  const height = lines.length * (o.fontSize + 5) + 22
  return <g className={`sketch-object label-object ${selected ? 'selected' : ''}`} transform={`translate(${o.x} ${o.y})`} onPointerDown={e => onPointerDown(e, o)}>
    <rect x="0" y="0" width={width} height={height} rx="7" fill={isComment ? '#fff8d8' : 'white'} stroke={o.color} strokeWidth={selected ? 3 : 1.5}/>
    {isLink && <foreignObject x="9" y={(height - 16) / 2} width="16" height="16"><ExternalLink size={16} color={o.color}/></foreignObject>}
    {lines.map((line, i) => <text key={i} x={isLink ? 31 : 14} y={12 + i * (o.fontSize + 5)} dominantBaseline="hanging" fontSize={o.fontSize} fontWeight={o.type === 'equipment' ? 750 : 550} fill={o.color}>{line}</text>)}
  </g>
}
