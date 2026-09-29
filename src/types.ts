export type Point = { x: number; y: number }
export type Tool = 'select' | 'free-dimension' | 'h-dimension' | 'v-dimension' | 'chain' | 'anchor' | 'h-guide' | 'v-guide' | 'module' | 'callout' | 'comment' | 'equipment' | 'link'
export type EquipmentType = 'Холодильник' | 'Духовой шкаф' | 'СВЧ' | 'ПММ' | 'Варочная панель' | 'Вытяжка' | 'Стиральная машина' | 'Мойка' | 'Другое'

export type BaseObject = {
  id: string
  type: string
  x: number
  y: number
  color: string
  fontSize: number
  width?: number
  height?: number
  fill?: string
  fillOpacity?: number
  borderRadius?: number
  hidden?: boolean
  locked?: boolean
}

export type DimensionObject = BaseObject & {
  type: 'dimension'
  orientation: 'horizontal' | 'vertical' | 'free'
  textOrientation?: 'parallel' | 'horizontal'
  offset?: number
  x2: number
  y2: number
  value: string
  lineWidth: number
  arrowStyle?: 'open' | 'closed' | 'tick'
  chainId?: string
  prefix?: string
  suffix?: string
  tolerance?: string
  showUnit?: boolean
  textPosition?: 'center' | 'above' | 'below'
}

export type ModuleObject = BaseObject & {
  type: 'module'
  number: string
  description: string
}

export type TextObject = BaseObject & {
  type: 'comment' | 'link' | 'equipment'
  text: string
  url?: string
  equipmentType?: EquipmentType
}

export type CalloutObject = BaseObject & {
  type: 'callout'
  targetX: number
  targetY: number
  text: string
  url?: string
}

export type AnchorObject = BaseObject & {
  type: 'anchor'
  label: string
}

export type GuideObject = BaseObject & {
  type: 'guide'
  orientation: 'horizontal' | 'vertical'
}

export type SketchObject = DimensionObject | ModuleObject | TextObject | CalloutObject | AnchorObject | GuideObject

export type SketchHeader = {
  enabled: boolean
  project: string
  room: string
  date: string
  variant: string
}

export type SketchProject = {
  version: 1
  id: string
  title: string
  createdAt: string
  updatedAt: string
  image: { dataUrl: string; width: number; height: number; name: string }
  imageDisplay?: { opacity: number; brightness: number; contrast: number; saturation: number; grayscale: boolean }
  objects: SketchObject[]
  header: SketchHeader
  integration: { projectId?: string; clientId?: string }
}

export type ProjectSummary = Pick<SketchProject, 'id' | 'title' | 'createdAt' | 'updatedAt'> & { thumbnail?: string }

export const uid = () => crypto.randomUUID()
export const todayRu = () => new Intl.DateTimeFormat('ru-RU').format(new Date())
