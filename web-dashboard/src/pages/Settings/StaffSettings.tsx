import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Pencil, Plus, Trash2 } from "lucide-react"

// ⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager

interface StaffSettingsProps {
    staffList: Array<{id: string; name: string; email: string; role: 'owner' | 'manager' | 'cashier' }>;
    currentUser: any;
    onAddStaff: () => void;
    onEditStaff: (staff: any) => void;
    onDeleteStaff: (id: string) => void;
}

export function StaffSettings({
    staffList,
    currentUser,
    onAddStaff,
    onEditStaff,
    onDeleteStaff
}: StaffSettingsProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Manajemen Staff</CardTitle>
                    <CardDescription>Kelola pengguna yang dapat mengakses sistem.</CardDescription>
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
    )
}
