"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bell, CheckCheck } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AuthGuard } from "@/components/auth-guard"
import api from "@/lib/api"
import type { Notification, PaginatedResponse } from "@/lib/types"
import { formatDate } from "@/lib/utils"

function NotificationsContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Notification>>("/mobcash/notification")
      return response.data
    },
  })

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await api.patch(`/mobcash/notification/${notificationId}/`, {
        is_read: true,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      toast.success("Notification marquée comme lue")
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la mise à jour")
    },
  })

  const unreadCount = data?.results.filter((n) => !n.is_read).length || 0

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{t("notifications")}</h1>
            {unreadCount > 0 && <p className="text-sm text-muted-foreground">{unreadCount} non lues</p>}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("notifications")}</CardTitle>
                <CardDescription>
                  {data?.count || 0} notification{(data?.count || 0) > 1 ? "s" : ""}
                </CardDescription>
              </div>
              <Bell className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">{t("loading")}</div>
            ) : !data?.results || data.results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t("noData")}</div>
            ) : (
              <div className="space-y-3">
                {data.results.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      notification.is_read ? "bg-background" : "bg-primary/5 border-primary/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{notification.title}</h3>
                          {!notification.is_read && <Badge variant="default">Nouveau</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{notification.content}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(notification.created_at)}</p>
                      </div>
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => markAsReadMutation.mutate(notification.id)}
                          disabled={markAsReadMutation.isPending}
                        >
                          <CheckCheck className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <NotificationsContent />
    </AuthGuard>
  )
}
