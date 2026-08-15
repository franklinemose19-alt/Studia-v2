export interface Unit {
  id: string
  name: string
  topics: string[]
}

export interface Course {
  id: string
  name: string
  code?: string
  units: Unit[]
  createdAt: string
}

const STORAGE_KEY = 'studia_courses'
const CHANGE_EVENT = 'studia:courses-changed'

export function loadCourses(): Course[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

export function saveCourses(courses: Course[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses))
    // Same-tab listeners — the browser's native 'storage' event only fires
    // in OTHER tabs, never the tab that made the change, so this custom
    // event covers the same-tab case and the listener below covers cross-tab.
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
  } catch { /* storage full */ }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// Call this once in any component that displays courses. Returns an
// unsubscribe function — call it in your useEffect cleanup.
export function onCoursesChanged(callback: () => void): () => void {
  const handleCustom = () => callback()
  const handleStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) callback() }
  window.addEventListener(CHANGE_EVENT, handleCustom)
  window.addEventListener('storage', handleStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, handleCustom)
    window.removeEventListener('storage', handleStorage)
  }
}

export function upsertCourseUnit(
  courses: Course[],
  courseName: string,
  unitName: string,
  topics: string[] = []
): { courses: Course[]; unitId: string } {
  const existingCourse = courses.find(c => c.name.trim().toLowerCase() === courseName.trim().toLowerCase())

  if (existingCourse) {
    const dupeUnit = existingCourse.units.find(u => u.name.trim().toLowerCase() === unitName.trim().toLowerCase())
    if (dupeUnit) {
      return { courses, unitId: dupeUnit.id }
    }
    const newUnitId = generateId()
    const updated = courses.map(c =>
      c.id === existingCourse.id ? { ...c, units: [...c.units, { id: newUnitId, name: unitName.trim(), topics }] } : c
    )
    return { courses: updated, unitId: newUnitId }
  }

  const newUnitId = generateId()
  const newCourse: Course = {
    id: generateId(),
    name: courseName.trim(),
    units: [{ id: newUnitId, name: unitName.trim(), topics }],
    createdAt: new Date().toISOString(),
  }
  return { courses: [...courses, newCourse], unitId: newUnitId }
}
