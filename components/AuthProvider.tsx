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
    login: (username: string, password: string) => Promise<void>
    logout: () => void
    loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        // Auto-login check
        const checkSession = async () => {
            try {
                const storedUser = localStorage.getItem('learning_mate_user')
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

    const login = async (username: string, password: string) => {
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
            localStorage.setItem('learning_mate_user', JSON.stringify(data.user))
            router.push('/')
        } catch (error) {
            throw error
        }
    }

    const logout = () => {
        setUser(null)
        localStorage.removeItem('learning_mate_user')
        router.push('/login')
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
