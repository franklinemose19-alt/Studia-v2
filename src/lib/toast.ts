export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration: number
}

type ToastListener = (toast: ToastItem) => void
type DismissListener = (id: string) => void

const addListeners: ToastListener[] = []
const dismissListeners: DismissListener[] = []

function emit(message: string, type: ToastType, duration: number) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const item: ToastItem = { id, message, type, duration }
  addListeners.forEach(l => l(item))
  return id
}

export const toast = {
  success: (message: string, duration = 3000) => emit(message, 'success', duration),
  error: (message: string, duration = 4500) => emit(message, 'error', duration),
  info: (message: string, duration = 3000) => emit(message, 'info', duration),
  warning: (message: string, duration = 3500) => emit(message, 'warning', duration),
  dismiss: (id: string) => dismissListeners.forEach(l => l(id)),
}

export function onToastAdd(listener: ToastListener) {
  addListeners.push(listener)
  return () => {
    const i = addListeners.indexOf(listener)
    if (i > -1) addListeners.splice(i, 1)
  }
}

export function onToastDismiss(listener: DismissListener) {
  dismissListeners.push(listener)
  return () => {
    const i = dismissListeners.indexOf(listener)
    if (i > -1) dismissListeners.splice(i, 1)
  }
}
