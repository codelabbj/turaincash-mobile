"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { ArrowLeft, Search, Filter, X, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AuthGuard } from "@/components/auth-guard"
import api from "@/lib/api"
import type { Transaction } from "@/lib/types"
import { TransactionActivityItem } from "@/components/transaction-activity-item"
import { 
  TYPE_TRANS, 
  TRANS_STATUS, 
} from "@/lib/constants"

function TransactionsContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [showFilters, setShowFilters] = useState<boolean>(false)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const response = await api.get<{
        count: number
        results: Transaction[]
      }>("/mobcash/transaction-history", {
        params: {
          page: 1,
          page_size: 100,
        }
      })
      return response.data
    },
    staleTime: 60 * 1000,
    refetchInterval: 120000,
  })

  // Filter transactions based on search and filters
  const filteredTransactions = useMemo(() => {
    if (!data?.results) return []
    
    return data.results.filter((transaction) => {
      // Search filter
      const matchesSearch = searchQuery === "" || 
        transaction.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.phone_number.includes(searchQuery) ||
        transaction.amount.toString().includes(searchQuery) ||
        transaction.app_details?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Type filter
      const matchesType = typeFilter === "all" || transaction.type_trans === typeFilter
      
      // Status filter
      const matchesStatus = statusFilter === "all" || transaction.status === statusFilter
      
      return matchesSearch && matchesType && matchesStatus
    })
  }, [data?.results, searchQuery, typeFilter, statusFilter])

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile Header */}
      <header className="bg-background border-b sticky top-0 z-50 safe-area-top">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold flex-1">Activité récente</h1>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => refetch()}
              aria-label="Actualiser"
            >
              <RefreshCw className={`h-5 w-5 ${isFetching && !isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par référence, téléphone ou montant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-11 text-base"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Mobile Filters */}
        {showFilters && (
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("type")}</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      {TYPE_TRANS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("status")}</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      {TRANS_STATUS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredTransactions.length} transaction{filteredTransactions.length > 1 ? "s" : ""}
          </p>
          {(typeFilter !== "all" || statusFilter !== "all" || searchQuery) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setTypeFilter("all")
                setStatusFilter("all")
                setSearchQuery("")
              }}
            >
              Effacer les filtres
            </Button>
          )}
        </div>

        {/* Mobile Transactions List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
            <p className="mt-2">{t("loading")}</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">Aucune transaction trouvée</p>
            <p className="text-sm mt-1">
              {searchQuery || typeFilter !== "all" || statusFilter !== "all" 
                ? "Essayez de modifier vos filtres de recherche" 
                : "Vous n'avez pas encore de transactions"}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTransactions.map((transaction) => (
              <TransactionActivityItem
                key={transaction.id}
                transaction={transaction}
                onClick={() => {
                  sessionStorage.setItem("cached_transaction", JSON.stringify(transaction))
                  router.push(`/transactions/detail?id=${transaction.id}`)
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <AuthGuard>
      <TransactionsContent />
    </AuthGuard>
  )
}
