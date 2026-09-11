import api from '../lib/api'

export interface PSAKAccount {
    id: number
    code: string
    name: string
    type: string
    parent_id: number | null
    is_active: boolean
    description: string
    created_at: string
}

export interface JournalEntryItem {
    id: number
    account_id: number
    account_code: string
    account_name: string
    debit: number
    credit: number
    description: string
}

export interface JournalEntry {
    id: number
    entry_number: string
    date: string
    description: string
    source_type: string
    source_id: number | null
    status: string
    posted_by: string
    voided_by: string | null
    voided_at: string | null
    items: JournalEntryItem[]
    total_debit: number
    total_credit: number
}

export interface TrialBalanceEntry {
    account_code: string
    account_name: string
    account_type: string
    debit: number
    credit: number
}

export interface BalanceSheetEntry {
    account_code: string
    account_name: string
    amount: number
}

export interface IncomeStatementEntry {
    account_code: string
    account_name: string
    amount: number
}

export interface CashFlowEntry {
    category: string
    amount: number
    description: string
}

export interface GeneralLedgerEntry {
    date: string
    entry_number: string
    description: string
    debit: number
    credit: number
    balance: number
}

export const PSAKService = {
    // Accounts
    getAccounts: async (accountType?: string, activeOnly?: boolean) => {
        const params: Record<string, string | boolean> = {}
        if (accountType) params.type = accountType
        if (activeOnly !== undefined) params.active_only = activeOnly
        const { data } = await api.get<PSAKAccount[]>('/psak/accounts', { params })
        return data
    },
    getAccount: async (id: number) => {
        const { data } = await api.get<PSAKAccount>(`/psak/accounts/${id}`)
        return data
    },
    createAccount: async (account: Omit<PSAKAccount, 'id' | 'is_active' | 'created_at'>) => {
        const { data } = await api.post<PSAKAccount>('/psak/accounts', account)
        return data
    },
    updateAccount: async (id: number, account: Partial<PSAKAccount>) => {
        const { data } = await api.put<PSAKAccount>(`/psak/accounts/${id}`, account)
        return data
    },
    deleteAccount: async (id: number) => {
        await api.delete(`/psak/accounts/${id}`)
    },
    seedAccounts: async () => {
        const { data } = await api.post<{ count: number }>('/psak/accounts/seed')
        return data
    },

    // Journal Entries
    getJournals: async (status?: string, startDate?: string, endDate?: string) => {
        const params: Record<string, string> = {}
        if (status) params.status = status
        if (startDate) params.start_date = startDate
        if (endDate) params.end_date = endDate
        const { data } = await api.get<JournalEntry[]>('/psak/journals', { params })
        return data
    },
    getJournal: async (id: number) => {
        const { data } = await api.get<JournalEntry>(`/psak/journals/${id}`)
        return data
    },
    createJournal: async (entry: { date: string; description: string; source_type?: string; source_id?: number; items: Omit<JournalEntryItem, 'id'>[] }) => {
        const { data } = await api.post<JournalEntry>('/psak/journals', entry)
        return data
    },
    postJournal: async (id: number) => {
        const { data } = await api.post<JournalEntry>(`/psak/journals/${id}/post`)
        return data
    },
    voidJournal: async (id: number) => {
        const { data } = await api.post<JournalEntry>(`/psak/journals/${id}/void`)
        return data
    },

    // Reports
    getTrialBalance: async (startDate: string, endDate: string) => {
        const { data } = await api.get<TrialBalanceEntry[]>('/psak/reports/trial-balance', { params: { start_date: startDate, end_date: endDate } })
        return data
    },
    getBalanceSheet: async (asOfDate: string) => {
        const { data } = await api.get<{ assets: BalanceSheetEntry[]; liabilities: BalanceSheetEntry[]; equity: BalanceSheetEntry[]; total_assets: number; total_liabilities: number; total_equity: number }>('/psak/reports/balance-sheet', { params: { as_of_date: asOfDate } })
        return data
    },
    getIncomeStatement: async (startDate: string, endDate: string) => {
        const { data } = await api.get<{ revenue: IncomeStatementEntry[]; expenses: IncomeStatementEntry[]; total_revenue: number; total_expenses: number; net_income: number }>('/psak/reports/income-statement', { params: { start_date: startDate, end_date: endDate } })
        return data
    },
    getCashFlow: async (startDate: string, endDate: string) => {
        const { data } = await api.get<{ operating: CashFlowEntry[]; investing: CashFlowEntry[]; financing: CashFlowEntry[]; net_operating: number; net_investing: number; net_financing: number }>('/psak/reports/cash-flow', { params: { start_date: startDate, end_date: endDate } })
        return data
    },
    getGeneralLedger: async (startDate: string, endDate: string) => {
        const { data } = await api.get<GeneralLedgerEntry[]>('/psak/reports/general-ledger', { params: { start_date: startDate, end_date: endDate } })
        return data
    },
}
