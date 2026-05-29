import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface User {
    id: string
    name: string
    email: string
    role: 'owner' | 'manager' | 'cashier'
}

interface AuthState {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    error: string | null
}

// Helper to get initial state from localStorage
const storedUser = localStorage.getItem('user')
const storedToken = localStorage.getItem('token')

const initialState: AuthState = {
    user: storedUser ? JSON.parse(storedUser) : null,
    isAuthenticated: !!storedToken,
    isLoading: false,
    error: null,
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
            state.user = null
            state.isAuthenticated = false
            state.error = null
        },
        updateProfile: (state, action: PayloadAction<Partial<User>>) => {
            if (state.user) {
                state.user = { ...state.user, ...action.payload }
                localStorage.setItem('user', JSON.stringify(state.user))
            }
        },
    },
})

export const { loginStart, loginSuccess, loginFailure, logout, updateProfile } = authSlice.actions
export default authSlice.reducer
