import { useState, useEffect } from "react"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Store, Printer, Percent, Bell, Save, Loader2, User as UserIcon, Users, Plus, Trash2, Pencil, Shield, Eye, EyeOff, Lock, FileText, Camera, CreditCard, Smartphone, Zap, AlertCircle, Info } from "lucide-react"
import { getImageUrl } from "../lib/utils"
import { useSelector } from "react-redux"
import { RootState } from "../store"
import { useSettings, useUpdateSetting, useUploadLogo } from '../hooks/useSettings'
import { useUpdateProfile, useChangePassword, useUsers } from '../hooks/useAuth'

export default function Settings() {
    const { user } = useSelector((state: RootState) => state.auth)

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activeSection, setActiveSection] = useState(user?.role === 'owner' ? "profile" : "printer")

    // Settings state
    const [settings, setSettings] = useState<Record<string, string>>({
        outlet_name: "",
        outlet_phone: "",
        outlet_address: "",
        tax_percentage: "0",
        service_charge: "0",
        enable_stock_alerts: "true",
        enable_daily_summary: "false",
        notification_email: user?.email || "",
        outlet_description: "",
        outlet_logo_url: "",
        sop_manager: "",
        sop_cashier: "",
        printer_ip: "",
        printer_connection: "network",
        printer_width: "80mm",
        auto_print: "false",
        xendit_api_key: "",
        xendit_callback_token: ""
    })

    // User profile state
    const [profile, setProfile] = useState({
        name: user?.name || "",
        email: user?.email || ""
    })

    // User management state
    const [staffList, setStaffList] = useState<any[]>([])
    const [showStaffModal, setShowStaffModal] = useState(false)
    const [editingStaff, setEditingStaff] = useState<any>(null)
    const [staffForm, setStaffForm] = useState<{
        name: string;
        email: string;
        password: string;
        role: 'owner' | 'manager' | 'cashier';
    }>({
        name: "",
        email: "",
        password: "",
        role: "cashier"
    })

    // Password change state
    const [passwordForm, setPasswordForm] = useState({
        current_password: "",
        new_password: "",
        confirm_password: ""
    })
    const [showPassword, setShowPassword] = useState(false)
    const [showStaffPass, setShowStaffPass] = useState(false)

    // React Query hooks
    const { data: settingsArr } = useSettings()
    const updateSetting = useUpdateSetting()
    const uploadLogoMutation = useUploadLogo()
    const updateProfileMutation = useUpdateProfile()
    const changePasswordMutation = useChangePassword()
    const usersManager = useUsers()

    // Populate local settings state from React Query data
    useEffect(() => {
        if (settingsArr) {
            if (Array.isArray(settingsArr)) {
                const mapped = (settingsArr as Array<{ key: string; value: string }>).reduce(
                    (acc, s) => ({ ...acc, [s.key]: s.value }),
                    {} as Record<string, string>
                )
                setSettings(prev => ({ ...prev, ...mapped }))
            } else {
                setSettings(prev => ({ ...prev, ...(settingsArr as any) }))
            }
            setLoading(false)
        }
    }, [settingsArr])

    // Load users for owner
    useEffect(() => {
        if (user?.role === 'owner') {
            usersManager.list().then(setStaffList)
        }
    }, [])

    const handleInputChange = (key: string, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }))
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setSaving(true)
            const response = await uploadLogoMutation.mutateAsync(file)
            setSettings({
                ...settings,
                outlet_logo_url: (response as any).url
            })
            alert("Logo uploaded successfully! Don't forget to save changes.")
        } catch (error: any) {
            console.error("Upload failed:", error)
            alert("Failed to upload logo: " + (error.response?.data?.error || error.message))
        } finally {
            setSaving(false)
        }
    }

    const handleSaveSettings = async () => {
        try {
            setSaving(true)
            await Promise.all(
                Object.entries(settings).map(([key, value]) =>
                    updateSetting.mutateAsync({ key, value: value || "" })
                )
            )
            alert("Outlet settings saved successfully!")
        } catch (error) {
            console.error("Failed to save settings", error)
            alert("Failed to save settings. Please try again.")
        } finally {
            setSaving(false)
        }
    }

    const handleSaveProfile = async () => {
        try {
            setSaving(true)
            await updateProfileMutation.mutateAsync(profile)
            alert("Admin profile updated successfully!")
        } catch (error) {
            console.error("Failed to update profile", error)
            alert("Failed to update profile. Please try again.")
        } finally {
            setSaving(false)
        }
    }

    const handleSaveStaff = async () => {
        try {
            setSaving(true)
            if (editingStaff) {
                await usersManager.update.mutateAsync({ id: String(editingStaff.id), ...staffForm })
                alert("Staff updated successfully!")
            } else {
                await usersManager.create.mutateAsync(staffForm)
                alert("New staff added successfully!")
            }
            setShowStaffModal(false)
            setEditingStaff(null)
            setStaffForm({ name: "", email: "", password: "", role: "cashier" })
            const users = await usersManager.list()
            setStaffList(users)
        } catch (error: any) {
            console.error("Failed to save staff", error)
            const errorMsg = error.response?.data?.error || "Email might already be taken or invalid data."
            alert(`Failed to save staff: ${errorMsg}`)
        } finally {
            setSaving(false)
        }
    }

    const handleUpdatePassword = async () => {
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            alert("New passwords do not match!")
            return
        }
        if (passwordForm.new_password.length < 5) {
            alert("New password must be at least 5 characters long.")
            return
        }
        try {
            setSaving(true)
            await changePasswordMutation.mutateAsync({
                current_password: passwordForm.current_password,
                new_password: passwordForm.new_password
            })
            setPasswordForm({ current_password: "", new_password: "", confirm_password: "" })
            alert("Password updated successfully!")
        } catch (error: any) {
            console.error("Failed to update password", error)
            alert(error.response?.data?.error || "Failed to update password.")
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteStaff = async (id: number) => {
        if (!confirm("Are you sure you want to remove this staff?")) return
        try {
            await usersManager.remove.mutateAsync(String(id))
            const users = await usersManager.list()
            setStaffList(users)
        } catch (error) {
            console.error("Failed to delete staff", error)
        }
    }

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Pengaturan</h1>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Settings Navigation Sidebar */}
                <div className="space-y-1">
                    {user?.role === 'owner' && (
                        <Button
                            variant={activeSection === "profile" ? "secondary" : "ghost"}
                            className="w-full justify-start gap-3"
                            onClick={() => setActiveSection("profile")}
                        >
                            <Store className="w-4 h-4" /> Profil Outlet
                        </Button>
                    )}
                    {user?.role === 'owner' && (
                        <Button
                            variant={activeSection === "admin" ? "secondary" : "ghost"}
                            className="w-full justify-start gap-3"
                            onClick={() => setActiveSection("admin")}
                        >
                            <UserIcon className="w-4 h-4" /> Akun Pemilik
                        </Button>
                    )}
                    {user?.role === 'owner' && (
                        <Button
                            variant={activeSection === "staff" ? "secondary" : "ghost"}
                            className="w-full justify-start gap-3"
                            onClick={() => setActiveSection("staff")}
                        >
                            <Users className="w-4 h-4" /> Manajemen Staff
                        </Button>
                    )}
                    {user?.role === 'owner' && (
                        <Button
                            variant={activeSection === "tax" ? "secondary" : "ghost"}
                            className="w-full justify-start gap-3"
                            onClick={() => setActiveSection("tax")}
                        >
                            <Percent className="w-4 h-4" /> Pajak & Layanan
                        </Button>
                    )}
                    {user?.role === 'owner' && (
                        <Button
                            variant={activeSection === "sop" ? "secondary" : "ghost"}
                            className="w-full justify-start gap-3"
                            onClick={() => setActiveSection("sop")}
                        >
                            <FileText className="w-4 h-4" /> Kebijakan & SOP
                        </Button>
                    )}
                    <Button
                        variant={activeSection === "printer" ? "secondary" : "ghost"}
                        className="w-full justify-start gap-3"
                        onClick={() => setActiveSection("printer")}
                    >
                        <Printer className="w-4 h-4" /> Printer Terhubung
                    </Button>
                    <Button
                        variant={activeSection === "notif" ? "secondary" : "ghost"}
                        className="w-full justify-start gap-3"
                        onClick={() => setActiveSection("notif")}
                    >
                        <Bell className="w-4 h-4" /> Notifikasi
                    </Button>
                    {user?.role === 'owner' && (
                        <Button
                            variant={activeSection === "integrations" ? "secondary" : "ghost"}
                            className="w-full justify-start gap-3"
                            onClick={() => setActiveSection("integrations")}
                        >
                            <Zap className="w-4 h-4" /> API Integrasi
                        </Button>
                    )}
                </div>

                {/* Main Settings Content Area */}
                <div className="lg:col-span-3 space-y-6">

                    {activeSection === "profile" && user?.role === 'owner' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Profil Outlet</CardTitle>
                                <CardDescription>Kelola detail bisnis dan lokasi Anda.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Nama Outlet</label>
                                        <Input
                                            value={settings.outlet_name}
                                            onChange={(e) => handleInputChange("outlet_name", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Nomor Telepon Bisnis</label>
                                        <Input
                                            value={settings.outlet_phone}
                                            onChange={(e) => handleInputChange("outlet_phone", e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Logo Outlet</label>
                                    <div className="flex gap-4 items-center">
                                        <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-200 overflow-hidden relative group">
                                            {settings.outlet_logo_url ? (
                                                <img
                                                    src={getImageUrl(settings.outlet_logo_url)}
                                                    alt="Logo"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Camera className="w-8 h-8 text-gray-400" />
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                                                <Camera className="w-6 h-6 text-white" />
                                            </div>
                                            <input
                                                type="file"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                                disabled={saving}
                                            />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <Input
                                                placeholder="Logo URL (Otomatis terisi saat upload)"
                                                value={settings.outlet_logo_url}
                                                onChange={(e) => handleInputChange("outlet_logo_url", e.target.value)}
                                            />
                                            <p className="text-[10px] text-gray-500 italic">Klik kotak gambar untuk mengunggah dari komputer Anda.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Deskripsi Bisnis</label>
                                    <textarea
                                        className="w-full min-h-[100px] border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder="Jelaskan secara singkat tentang kedai kopi Anda..."
                                        value={settings.outlet_description}
                                        onChange={(e) => handleInputChange("outlet_description", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Alamat</label>
                                    <Input
                                        value={settings.outlet_address}
                                        onChange={(e) => handleInputChange("outlet_address", e.target.value)}
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="justify-end border-t border-gray-100 p-4">
                                <Button className="gap-2" onClick={handleSaveSettings} disabled={saving}>
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Simpan Perubahan
                                </Button>
                            </CardFooter>
                        </Card>
                    )}

                    {activeSection === "admin" && user?.role === 'owner' && (
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
                                        Peran: <span className="font-bold underline">{user?.role === 'owner' ? 'Pemilik' : user?.role}</span> (Terbatas)
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
                    )}

                    {activeSection === "staff" && user?.role === 'owner' && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Manajemen Staff</CardTitle>
                                    <CardDescription>Kelola pengguna yang dapat mengakses sistem.</CardDescription>
                                </div>
                                <Button className="gap-2" onClick={() => { setEditingStaff(null); setStaffForm({ name: "", email: "", password: "", role: "cashier" }); setShowStaffModal(true); }}>
                                    <Plus className="w-4 h-4" /> Tambah Staff
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-700 font-medium">
                                            <tr>
                                                <th className="px-4 py-3">Nama</th>
                                                <th className="px-4 py-3">Email</th>
                                                <th className="px-4 py-3">Peran</th>
                                                <th className="px-4 py-3 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {staffList.map((staff) => (
                                                <tr key={staff.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-medium">{staff.name}</td>
                                                    <td className="px-4 py-3 text-gray-500">{staff.email}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant={staff.role === 'owner' ? 'success' : staff.role === 'manager' ? 'secondary' : 'outline'}>
                                                            {staff.role}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex justify-end gap-2 text-gray-500">
                                                            <button
                                                                className="hover:text-primary transition-colors"
                                                                onClick={() => {
                                                                    setEditingStaff(staff);
                                                                    setStaffForm({ name: staff.name, email: staff.email, password: "", role: staff.role });
                                                                    setShowStaffModal(true);
                                                                }}
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                            {staff.id !== user?.id && (
                                                                <button className="hover:text-red-600 transition-colors" onClick={() => handleDeleteStaff(staff.id)}>
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {showStaffModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <Card className="w-full max-w-md">
                                <CardHeader>
                                    <CardTitle>{editingStaff ? 'Edit Staff' : 'Tambah Staff Baru'}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Nama Lengkap</label>
                                        <Input
                                            value={staffForm.name}
                                            onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                                            placeholder="Nama Lengkap"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Alamat Email</label>
                                        <Input
                                            type="email"
                                            value={staffForm.email}
                                            onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                                            placeholder="email@contoh.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                            {editingStaff ? 'Password Baru (Opsional)' : 'Password Awal'}
                                        </label>
                                        <div className="relative">
                                            <Input
                                                type={showStaffPass ? "text" : "password"}
                                                value={staffForm.password}
                                                onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                                                placeholder={editingStaff ? "Kosongkan jika tidak ingin mengubah" : ""}
                                            />
                                            <button
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                onClick={() => setShowStaffPass(!showStaffPass)}
                                            >
                                                {showStaffPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Peran</label>
                                        <select
                                            className="w-full h-10 border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            value={staffForm.role}
                                            onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as 'owner' | 'manager' | 'cashier' })}
                                        >
                                            <option value="cashier">Kasir</option>
                                            <option value="manager">Manajer</option>
                                            <option value="owner">Pemilik</option>
                                        </select>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-end gap-3 p-4 border-t">
                                    <Button variant="ghost" onClick={() => setShowStaffModal(false)}>Batal</Button>
                                    <Button onClick={handleSaveStaff} disabled={saving}>
                                        {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                        {editingStaff ? 'Perbarui Staff' : 'Simpan Staff'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    )}

                    {activeSection === "sop" && user?.role === 'owner' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Policy & Standard Operating Procedures</CardTitle>
                                <CardDescription>Definisikan panduan operasional untuk anggota tim Anda.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 text-blue-800 text-xs italic">
                                    <Info className="w-5 h-5 shrink-0" />
                                    <p>SOP yang Anda tulis di sini akan muncul di Dashboard utama aplikasi Mobile POS sebagai referensi cepat bagi staf.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-primary" /> Manager SOP
                                    </label>
                                    <textarea
                                        className="w-full min-h-[150px] border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                                        placeholder="1. Buka toko jam 07:00&#10;2. Cek stok pagi..."
                                        value={settings.sop_manager}
                                        onChange={(e) => handleInputChange("sop_manager", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Users className="w-4 h-4 text-primary" /> SOP Kasir
                                    </label>
                                    <textarea
                                        className="w-full min-h-[150px] border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                                        placeholder="1. Sambut setiap pelanggan dengan senyuman&#10;2. Konfirmasi pesanan sebelum pembayaran..."
                                        value={settings.sop_cashier}
                                        onChange={(e) => handleInputChange("sop_cashier", e.target.value)}
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="justify-end border-t border-gray-100 p-4">
                                <Button className="gap-2" onClick={handleSaveSettings} disabled={saving}>
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Update Team SOP
                                </Button>
                            </CardFooter>
                        </Card>
                    )}
                    {activeSection === "tax" && user?.role === 'owner' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Pajak & Layanan</CardTitle>
                                <CardDescription>Konfigurasi pajak dan biaya layanan tambahan.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Persentase Pajak (%)</label>
                                        <Input
                                            type="number"
                                            value={settings.tax_percentage}
                                            onChange={(e) => handleInputChange("tax_percentage", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Biaya Layanan (%)</label>
                                        <Input
                                            type="number"
                                            value={settings.service_charge}
                                            onChange={(e) => handleInputChange("service_charge", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="justify-end border-t border-gray-100 p-4">
                                <Button className="gap-2" onClick={handleSaveSettings} disabled={saving}>
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Simpan Pengaturan
                                </Button>
                            </CardFooter>
                        </Card>
                    )}

                    {activeSection === "printer" && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Printer Configuration</CardTitle>
                                <CardDescription>Konfigurasi printer thermal untuk struk dan dapur.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg flex gap-3 text-orange-800 text-sm">
                                    <Printer className="w-5 h-5 shrink-0" />
                                    <p>Pengaturan ini akan disinkronkan dengan aplikasi Mobile POS. Pastikan printer berada di jaringan (WiFi) yang sama dengan tablet Anda.</p>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold border-b pb-2">Printer Struk Utama</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Tipe Koneksi</label>
                                            <select
                                                className="w-full h-10 border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                value={settings.printer_connection || "network"}
                                                onChange={(e) => handleInputChange("printer_connection", e.target.value)}
                                            >
                                                <option value="network">LAN / Network (Direkomendasikan)</option>
                                                <option value="bluetooth">Bluetooth (Khusus Mobile)</option>
                                                <option value="usb">USB</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Alamat IP</label>
                                            <Input
                                                placeholder="e.g. 192.168.1.100"
                                                value={settings.printer_ip}
                                                onChange={(e) => handleInputChange("printer_ip", e.target.value)}
                                                disabled={settings.printer_connection !== "network"}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Lebar Kertas</label>
                                            <select
                                                className="w-full h-10 border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                value={settings.printer_width || "80mm"}
                                                onChange={(e) => handleInputChange("printer_width", e.target.value)}
                                            >
                                                <option value="58mm">58mm (Kecil)</option>
                                                <option value="80mm">80mm (Standar)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Cetak Otomatis</label>
                                            <div className="flex items-center gap-2 h-10">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-primary"
                                                    checked={settings.auto_print === "true"}
                                                    onChange={(e) => handleInputChange("auto_print", e.target.checked ? "true" : "false")}
                                                />
                                                <span className="text-sm">Cetak struk setiap transaksi selesai</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="justify-end border-t border-gray-100 p-4">
                                <Button className="gap-2" onClick={handleSaveSettings} disabled={saving}>
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Simpan Pengaturan Printer
                                </Button>
                            </CardFooter>
                        </Card>
                    )}

                    {activeSection === "notif" && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Notifikasi & Alert</CardTitle>
                                <CardDescription>Konfigurasi peringatan stok dan laporan sistem.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="p-4 border rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="space-y-0.5">
                                            <p className="font-medium">Peringatan Stok Habis</p>
                                            <p className="text-sm text-gray-500">Munculkan notifikasi di dashboard jika bahan baku di bawah stok minim.</p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                                                checked={settings.enable_stock_alerts === "true"}
                                                onChange={(e) => handleInputChange("enable_stock_alerts", e.target.checked ? "true" : "false")}
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 border rounded-lg space-y-4 bg-gray-50 opacity-70 cursor-not-allowed">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium">Ringkasan Penjualan Harian (Email)</p>
                                                    <Badge variant="outline" className="text-[8px] uppercase">Coming Soon</Badge>
                                                </div>
                                                <p className="text-sm text-gray-500">Terima rekap harian melalui email otomatis.</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    disabled
                                                    className="w-5 h-5 rounded border-gray-300 text-primary opacity-50"
                                                    checked={false}
                                                />
                                            </div>
                                        </div>
                                        <div className="p-3 bg-white border border-gray-200 rounded-xl flex gap-2 text-[10px] text-gray-500 font-bold italic">
                                            <AlertCircle size={14} className="shrink-0" />
                                            <span>Fitur ini memerlukan konfigurasi SMTP Server pada backend. Hubungi IT Support.</span>
                                        </div>
                                    </div>

                                    <div className="p-4 border rounded-lg flex items-center justify-between opacity-50 grayscale">
                                        <div className="space-y-0.5">
                                            <p className="font-medium text-gray-400">Notifikasi WhatsApp Langsung</p>
                                            <p className="text-sm text-gray-400">Kirim struk digital ke WhatsApp pelanggan.</p>
                                        </div>
                                        <Badge variant="secondary">Enterprise Only</Badge>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="justify-end border-t border-gray-100 p-4">
                                <Button className="gap-2" onClick={handleSaveSettings} disabled={saving}>
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Simpan Pengaturan Notifikasi
                                </Button>
                            </CardFooter>
                        </Card>
                    )}
                    {activeSection === "integrations" && user?.role === 'owner' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>API Integrasi</CardTitle>
                                <CardDescription>Konfigurasi kunci akses untuk layanan pihak ketiga.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-4 bg-gray-50 border rounded-lg space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                            <CreditCard className="w-4 h-4" />
                                        </div>
                                        <h3 className="font-bold text-sm">Xendit Payment Gateway</h3>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400">Secret API Key</label>
                                        <Input
                                            type="password"
                                            placeholder="xnd_production_..."
                                            value={settings.xendit_api_key || ""}
                                            onChange={(e) => handleInputChange("xendit_api_key", e.target.value)}
                                        />
                                        <p className="text-[10px] text-gray-500">Wajib diisi untuk mengaktifkan pembayaran QRIS otomatis.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400">Callback Verification Token</label>
                                        <Input
                                            type="password"
                                            placeholder="Gunakan token unik untuk keamanan"
                                            value={settings.xendit_callback_token || ""}
                                            onChange={(e) => handleInputChange("xendit_callback_token", e.target.value)}
                                        />
                                        <p className="text-[10px] text-gray-500 italic">Samakan dengan 'Callback Token' di Dashboard Xendit Anda.</p>
                                    </div>
                                </div>

                                <div className="p-4 border border-dashed rounded-lg opacity-50 grayscale">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                                                <Smartphone className="w-4 h-4" />
                                            </div>
                                            <h3 className="font-bold text-sm text-gray-400">GoFood / GrabFood Bridge</h3>
                                        </div>
                                        <Badge variant="outline">Enterprise</Badge>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="justify-end border-t border-gray-100 p-4">
                                <Button className="gap-2" onClick={handleSaveSettings} disabled={saving}>
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Simpan Kunci API
                                </Button>
                            </CardFooter>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
