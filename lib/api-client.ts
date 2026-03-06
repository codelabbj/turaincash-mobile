import api from "./api"
import type { Transaction } from "./types"

export const transactionApi = {

    getLastTransaction: async () => {
        const { data } = await api.get<Transaction>("/mobcash/last-transaction")
        return data
    },

    cancelTransaction: async (reference: string) => {
        const { data } = await api.post("/mobcash/cancel-transaction", {
            reference,
        })
        return data
    },

    finalizeTransaction: async (reference: string) => {
        const { data } = await api.post<Transaction>("/mobcash/finalize-transaction-user", {
            reference,
        })
        return data
    },
}