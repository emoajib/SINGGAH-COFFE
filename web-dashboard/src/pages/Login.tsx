import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/card"
import { Coffee, Loader2, Eye, EyeOff } from "lucide-react"
import { useEffect, useState } from "react"
import { fetchSettings } from "../services/settingsService"
import { getImageUrl } from "../lib/utils"
import { useLogin } from "../hooks/useAuth"

export default function Login() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [logoUrl, setLogoUrl] = useState("")
    const [outletName, setOutletName] = useState("Singgah Coffee")

    const loginMutation = useLogin()

    useEffect(() => {
        const loadBranding = async () => {
            try {
                // We use a separate fetch or public settings if needed, 
                // but since login is public, ensure fetchSettings can handle it or use a default
                const settings = await fetchSettings()
                if (settings.outlet_logo_url) setLogoUrl(settings.outlet_logo_url)
                if (settings.outlet_name) setOutletName(settings.outlet_name)
            } catch (error) {
                console.error("Failed to load branding on login:", error)
            }
        }
        loadBranding()
    }, [])

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        loginMutation.mutate({ email, password })
    }

    const isLoading = loginMutation.isPending
    const error = loginMutation.error
        ? (loginMutation.error as any)?.response?.data?.error || loginMutation.error.message
        : null

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 items-center text-center">
                    {logoUrl ? (
                        <div className="w-20 h-20 rounded-2xl overflow-hidden mb-2 border-2 border-white shadow-md">
                            <img
                                src={getImageUrl(logoUrl)}
                                alt="Logo"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className="bg-primary/10 p-3 rounded-full mb-2">
                            <Coffee className="w-8 h-8 text-primary" />
                        </div>
                    )}
                    <CardTitle className="text-2xl font-bold text-primary">{outletName}</CardTitle>
                    <CardDescription>Masukkan kredensial Anda untuk mengakses dashboard</CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">Email</label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="pemilik@singgah.coffee"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium">Kata Sandi</label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLoading ? "Masuk..." : "Masuk"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
