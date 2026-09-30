import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Pencil, Plus, Trash2, ShieldCheck, Lock } from "lucide-react"
import type { User } from "../../types"

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager

interface StaffSettingsProps {
    staffList: User[];
    currentUser: any;
    managerAccountingAccess?: boolean;
    onToggleManagerAccountingAccess?: (enabled: boolean) => void;
    onAddStaff: () => void;
    onEditStaff: (staff: User) => void;
    onDeleteStaff: (id: number) => void;
}

export function StaffSettings({
    staffList,
    currentUser,
    managerAccountingAccess = false,
    onToggleManagerAccountingAccess,
    onAddStaff,
    onEditStaff,
    onDeleteStaff
}: StaffSettingsProps) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Manajemen Staff</CardTitle>
                        <CardDescription>Kelola pengguna yang dapat mengakses sistem POS.</CardDescription>
                    </div>
                    <Button className="gap-2" onClick={onAddStaff}>
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
                                                    onClick={() => onEditStaff(staff)}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                {staff.id !== currentUser?.id && (
                                                    <button className="hover:text-red-600 transition-colors" onClick={() => onDeleteStaff(staff.id)}>
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

            {/* Otorisasi Akses Akuntansi PSAK (Owner Control) */}
            <Card className="border-amber-200/80 bg-gradient-to-r from-amber-50/50 to-orange-50/30">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-amber-700" />
                        <CardTitle className="text-base text-gray-900">Hak Akses Pembukuan Akuntansi (PSAK)</CardTitle>
                    </div>
                    <CardDescription>
                        Kontrol keamanan dan segregasi peran untuk modul Buku Besar (CoA), Jurnal Umum, dan Laporan Neraca/Laba Rugi.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-amber-200 bg-white shadow-xs">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-gray-900">Izinkan Manajer Mengakses Akun Akuntansi & Jurnal</span>
                                <Badge variant={managerAccountingAccess ? "success" : "outline"} className="text-[10px]">
                                    {managerAccountingAccess ? "Diberikan Izin" : "Hanya Owner"}
                                </Badge>
                            </div>
                            <p className="text-xs text-gray-500">
                                Jika diaktifkan, user dengan peran <strong>Manager</strong> dapat melihat bagan akun (CoA), menginput jurnal umum, dan membaca laporan keuangan. Jika nonaktif, hanya <strong>Owner</strong> yang memiliki akses.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                checked={managerAccountingAccess}
                                onChange={(e) => onToggleManagerAccountingAccess?.(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-700"></div>
                        </label>
                    </div>

                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600">
                        <Lock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <span>
                            <strong>Perlindungan Kasir:</strong> Kasir/Barista diblokir mutlak oleh sistem backend dan menu dashboard. Kasir tidak memiliki akses terhadap akun akuntansi dalam kondisi apa pun untuk mencegah manipulasi keuangan.
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
