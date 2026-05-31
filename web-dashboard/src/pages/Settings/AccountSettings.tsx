import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Button } from "../../components/ui/button"
import { Eye, EyeOff, Loader2, Lock, Save } from "lucide-react"
import { useState } from "react"

// ⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager

interface AccountSettingsProps {
    profile: { name: string; email: string };
    passwordForm: any;
    saving: boolean;
    currentUser: any;
    setProfile: (profile: any) => void;
    setPasswordForm: (form: any) => void;
    handleSaveProfile: () => void;
    handleUpdatePassword: () => void;
}

export function AccountSettings({
    profile,
    passwordForm,
    saving,
    currentUser,
    setProfile,
    setPasswordForm,
    handleSaveProfile,
    handleUpdatePassword
}: AccountSettingsProps) {
    const [showPassword, setShowPassword] = useState(false)

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Akun Pemilik</CardTitle>
                    <CardDescription>Perbarui profil administrator pribadi Anda.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nama Lengkap</label>
                            <Input
                                value={profile.name}
                                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Alamat Email</label>
                            <Input
                                type="email"
                                value={profile.email}
                                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-md text-blue-700 text-sm">
                        Peran: <span className="font-bold underline">{currentUser?.role === 'owner' ? 'Pemilik' : currentUser?.role}</span> (Terbatas)
                    </div>
                </CardContent>
                <CardFooter className="justify-end border-t border-gray-100 p-4">
                    <Button className="gap-2" onClick={handleSaveProfile} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Perbarui Profil
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5" /> Ubah Password
                    </CardTitle>
                    <CardDescription>Amankan akun Anda dengan memperbarui password secara berkala.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Password Saat Ini</label>
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                value={passwordForm.current_password}
                                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                                placeholder="Masukkan password saat ini"
                            />
                            <button
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Password Baru</label>
                            <Input
                                type={showPassword ? "text" : "password"}
                                value={passwordForm.new_password}
                                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                                placeholder="Min 5 characters"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Confirm New Password</label>
                            <Input
                                type={showPassword ? "text" : "password"}
                                value={passwordForm.confirm_password}
                                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                                placeholder="Repeat new password"
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="justify-end border-t border-gray-100 p-4">
                    <Button variant="outline" className="gap-2" onClick={handleUpdatePassword} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                        Ubah Password
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
