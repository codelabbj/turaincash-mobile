"use client"

import { Component, type ReactNode } from "react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Error caught by boundary:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-destructive">Une erreur est survenue</h2>
            <p className="text-muted-foreground">Veuillez réessayer ou contacter le support si le problème persiste.</p>
            <Button
              onClick={() => {
                this.setState({ hasError: false })
                window.location.href = "/"
              }}
            >
              Retour à l'accueil
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
