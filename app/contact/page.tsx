"use client"

import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { SupportChatbot } from "@/components/SupportChatbot"
import { useSettings } from "@/hooks/use-settings"

function ContactContent() {
  const router = useRouter()
  const { chatbotEnabled, isLoading } = useSettings()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isLoading) setReady(true)
  }, [isLoading])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-muted/30">
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="px-3 py-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold flex-1">Support</h1>
        </div>
      </header>

      <main className="flex-1 min-h-0 p-3">
        {!ready ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : chatbotEnabled ? (
          <SupportChatbot pageKey="contact" route="/contact" screenTitle="Support" />
        ) : (
          <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
            L&apos;assistant IA n&apos;est pas activé pour le moment. Utilisez WhatsApp ou Telegram depuis le tableau de bord.
          </div>
        )}
      </main>
    </div>
  )
}

export default function ContactPage() {
  return (
    <AuthGuard>
      <ContactContent />
    </AuthGuard>
  )
}
