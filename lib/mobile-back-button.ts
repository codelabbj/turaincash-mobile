import { App } from '@capacitor/app'

export class MobileBackButtonHandler {
  private static instance: MobileBackButtonHandler
  private isInitialized = false
  private backButtonCallback?: (e?: Event) => void
  private eventListeners: Array<{ element: EventTarget; event: string; handler: EventListener }> = []
  private capacitorListener?: any

  private constructor() {}

  static getInstance(): MobileBackButtonHandler {
    if (!MobileBackButtonHandler.instance) {
      MobileBackButtonHandler.instance = new MobileBackButtonHandler()
    }
    return MobileBackButtonHandler.instance
  }

  initialize(callback: (e?: Event) => void) {
    if (this.isInitialized) return
    this.backButtonCallback = callback

    const handleBackButton = (e?: Event) => {
      if (this.backButtonCallback) {
        this.backButtonCallback(e)
      }
    }

    // Use Capacitor App plugin for native back button handling
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      this.capacitorListener = App.addListener('backButton', ({ canGoBack }) => {
        // Always prevent default exit behavior
        handleBackButton()
      })
    }

    // Fallback event listeners for web/browser
    const events = [
      { element: document, event: 'backbutton', handler: (e: Event) => { e.preventDefault(); e.stopPropagation(); handleBackButton(e) } },
      { element: window, event: 'backbutton', handler: (e: Event) => { e.preventDefault(); e.stopPropagation(); handleBackButton(e) } },
      { element: window, event: 'popstate', handler: (e: Event) => { e.preventDefault(); e.stopPropagation(); handleBackButton(e) } },
      { element: window, event: 'mobileBackButton', handler: (e: Event) => { e.preventDefault(); e.stopPropagation(); handleBackButton(e) } }
    ]

    events.forEach(({ element, event, handler }) => {
      element.addEventListener(event, handler, false)
      this.eventListeners.push({ element, event, handler })
    })

    this.isInitialized = true
  }

  setCallback(callback: (e?: Event) => void) {
    this.backButtonCallback = callback
  }

  cleanup() {
    if (this.capacitorListener) {
      this.capacitorListener.remove()
      this.capacitorListener = undefined
    }
    if (this.isInitialized) {
      this.eventListeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler)
      })
      this.eventListeners = []
      this.isInitialized = false
    }
  }
}

export const mobileBackButtonHandler = MobileBackButtonHandler.getInstance()

