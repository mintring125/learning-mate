'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
    id: string
    username: string
    isAdmin: boolean
}

interface AuthContextType {
    user: User | null
    login: (username: string, password: string, rememberMe?: boolean) => Promise<void>
    logout: () => void
    loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        // Auto-login check - check both localStorage and sessionStorage
        const checkSession = async () => {
            try {
                // First check localStorage (remember me), then sessionStorage
                const storedUser = localStorage.getItem('learning_mate_user') || sessionStorage.getItem('learning_mate_user')
                if (storedUser) {
                    setUser(JSON.parse(storedUser))
                }
            } catch (error) {
                console.error('Auto-login failed', error)
            } finally {
                setLoading(false)
            }
        }
        checkSession()
    }, [])

    const login = async (username: string, password: string, rememberMe: boolean = true) => {
        // Fetch to our backend to verify the user exists and check password
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.message || 'Login failed')
            }

            const data = await res.json()
            setUser(data.user)

            // Use localStorage for remember me (persistent), sessionStorage otherwise (cleared on browser close)
            if (rememberMe) {
                localStorage.setItem('learning_mate_user', JSON.stringify(data.user))
            } else {
                sessionStorage.setItem('learning_mate_user', JSON.stringify(data.user))
            }

            router.replace('/') // Use replace to prevent back button loop
        } catch (error) {
            throw error
        }
    }

    const logout = () => {
        setUser(null)
        // Clear both storages on logout
        localStorage.removeItem('learning_mate_user')
        sessionStorage.removeItem('learning_mate_user')
        router.replace('/login') // Use replace to prevent back button loop
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
