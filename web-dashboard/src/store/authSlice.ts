import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { User, CashRegister } from '../types'

interface AuthState {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    error: string | null
    cashFloatPending: boolean
    openCashRegister: CashRegister | null
}

export type { User }

// Helper to get initial state from localStorage safely
const getStoredUser = () => {
    try {
        const storedUser = localStorage.getItem('user')
        return storedUser ? JSON.parse(storedUser) : null
    } catch (e) {
            void e
        localStorage.removeItem('user')
        return null
    }
}

const storedToken = localStorage.getItem('token')

const getStoredOpenCashRegister = () => {
    try {
        const stored = localStorage.getItem('open_cash_register')
        return stored ? JSON.parse(stored) : null
    } catch (e) {
        void e
        localStorage.removeItem('open_cash_register')
        return null
    }
}

const initialState: AuthState = {
    user: getStoredUser(),
    isAuthenticated: !!storedToken,
    isLoading: false,
    error: null,
    cashFloatPending: getStoredUser()?.role === 'cashier' && !getStoredOpenCashRegister(),
    openCashRegister: getStoredOpenCashRegister(),
}

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        loginStart: (state) => {
            state.isLoading = true
            state.error = null
        },
        loginSuccess: (state, action: PayloadAction<User>) => {
            state.isLoading = false
            state.isAuthenticated = true
            state.user = action.payload
            state.error = null
            state.cashFloatPending = action.payload.role === 'cashier' && !state.openCashRegister
        },
        loginFailure: (state, action: PayloadAction<string>) => {
            state.isLoading = false
            state.isAuthenticated = false
            state.user = null
            state.error = action.payload
        },
        logout: (state) => {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            localStorage.removeItem('open_cash_register')
            state.user = null
            state.isAuthenticated = false
            state.error = null
            state.cashFloatPending = false
            state.openCashRegister = null
        },
        updateProfile: (state, action: PayloadAction<Partial<User>>) => {
            if (state.user) {
                state.user = { ...state.user, ...action.payload }
                localStorage.setItem('user', JSON.stringify(state.user))
            }
        },
        setCashFloatPending: (state, action: PayloadAction<boolean>) => {
            state.cashFloatPending = action.payload
        },
        setOpenCashRegister: (state, action: PayloadAction<CashRegister | null>) => {
            state.openCashRegister = action.payload
            state.cashFloatPending = action.payload === null || (state.user?.role === 'cashier' && action.payload === null)
            if (action.payload) {
                localStorage.setItem('open_cash_register', JSON.stringify(action.payload))
            } else {
                localStorage.removeItem('open_cash_register')
            }
        },
    },
})

export const { loginStart, loginSuccess, loginFailure, logout, updateProfile, setCashFloatPending, setOpenCashRegister } = authSlice.actions
export default authSlice.reducer
