import { useState, useEffect } from "react"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../components/ui/card"
import { Store, Printer, Percent, Bell, Loader2, User as UserIcon, Users, Zap, Eye, EyeOff, FileText } from "lucide-react"
import { useSelector } from "react-redux"
import { RootState } from "../store"
import type { User } from '../types'
import { useSettings, useUpdateSetting, useUploadLogo } from '../hooks/useSettings'
import { useUpdateProfile, useChangePassword, useUsers } from '../hooks/useAuth'

// Import sub-components
import { ProfileSettings } from "./Settings/ProfileSettings"
import { AccountSettings } from "./Settings/AccountSettings"
import { StaffSettings } from "./Settings/StaffSettings"
import { TaxSettings } from "./Settings/TaxSettings"
import { SopSettings } from "./Settings/SopSettings"
import { PrinterSettings } from "./Settings/PrinterSettings"
import { NotificationSettings } from "./Settings/NotificationSettings"
import { IntegrationSettings } from "./Settings/IntegrationSettings"


// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager

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
        xendit_callback_token: "",
        initial_capital: "0",
        initial_capital_amortization_months: "12"
    })

    // User profile state
    const [profile, setProfile] = useState({
        name: user?.name || "",
        email: user?.email || ""
    })

    // User management state
    const [staffList, setStaffList] = useState<User[]>([])
    const [showStaffModal, setShowStaffModal] = useState(false)
    const [editingStaff, setEditingStaff] = useState<User | null>(null)
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
            void error
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
            void error
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
            void error
            alert("Failed to update profile. Please try again.")
        } finally {
            setSaving(false)
        }
    }

    const handleSaveStaff = async () => {
        try {
            setSaving(true)
            if (editingStaff) {
                await usersManager.update.mutateAsync({ id: editingStaff.id, ...staffForm })
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
            void error
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
            void error
            alert(error.response?.data?.error || "Failed to update password.")
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteStaff = async (id: number) => {
        if (!confirm("Are you sure you want to remove this staff?")) return
        try {
            await usersManager.remove.mutateAsync(id)
            const users = await usersManager.list()
            setStaffList(users)
        } catch (error) {
            void error
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
                        <ProfileSettings
                            settings={settings}
                            saving={saving}
                            handleInputChange={handleInputChange}
                            handleLogoUpload={handleLogoUpload}
                            handleSaveSettings={handleSaveSettings}
                        />
                    )}

                    {activeSection === "admin" && user?.role === 'owner' && (
                        <AccountSettings
                            profile={profile}
                            passwordForm={passwordForm}
                            saving={saving}
                            currentUser={user}
                            setProfile={setProfile}
                            setPasswordForm={setPasswordForm}
                            handleSaveProfile={handleSaveProfile}
                            handleUpdatePassword={handleUpdatePassword}
                        />
                    )}

                    {activeSection === "staff" && user?.role === 'owner' && (
                        <StaffSettings
                            staffList={staffList}
                            currentUser={user}
                            onAddStaff={() => { setEditingStaff(null); setStaffForm({ name: "", email: "", password: "", role: "cashier" }); setShowStaffModal(true); }}
                            onEditStaff={(staff) => {
                                setEditingStaff(staff);
                                setStaffForm({ name: staff.name, email: staff.email, password: "", role: staff.role });
                                setShowStaffModal(true);
                            }}
                            onDeleteStaff={handleDeleteStaff}
                        />
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
                        <SopSettings
                            settings={settings}
                            saving={saving}
                            handleInputChange={handleInputChange}
                            handleSaveSettings={handleSaveSettings}
                        />
                    )}
                    {activeSection === "tax" && user?.role === 'owner' && (
                        <TaxSettings
                            settings={settings}
                            saving={saving}
                            handleInputChange={handleInputChange}
                            handleSaveSettings={handleSaveSettings}
                        />
                    )}

                    {activeSection === "printer" && (
                        <PrinterSettings
                            settings={settings}
                            saving={saving}
                            handleInputChange={handleInputChange}
                            handleSaveSettings={handleSaveSettings}
                        />
                    )}

                    {activeSection === "notif" && (
                        <NotificationSettings
                            settings={settings}
                            saving={saving}
                            handleInputChange={handleInputChange}
                            handleSaveSettings={handleSaveSettings}
                        />
                    )}
                    {activeSection === "integrations" && user?.role === 'owner' && (
                        <IntegrationSettings
                            settings={settings}
                            saving={saving}
                            handleInputChange={handleInputChange}
                            handleSaveSettings={handleSaveSettings}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
