import { useRef, useState } from "react"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Database, Upload, Archive, RefreshCw, Download, Upload as UploadIcon, HardDrive, Clock, FileText, CheckCircle, XCircle } from "lucide-react"
import { useBackupStatus, useBackupHistory, useCreateBackup, useRestoreBackup, useDownloadBackup, useUploadBackup, usePushBackup, usePullBackup } from "../hooks/useBackup"
import type { BackupFile } from "../types"

export default function BackupManagement() {
  const [activeTab, setActiveTab] = useState("backup")
  const [runningBackup, setRunningBackup] = useState(false)
  const [backupResult, setBackupResult] = useState<any>(null)

  const { data: status } = useBackupStatus()
  const { data: history, isLoading: historyLoading, refetch: refetchHistory } = useBackupHistory()
  const createBackup = useCreateBackup()
  const restoreBackup = useRestoreBackup()
  const downloadBackup = useDownloadBackup()
  const uploadBackup = useUploadBackup()
  const pushBackup = usePushBackup()
  const pullBackup = usePullBackup()

  const [syncing, setSyncing] = useState<"push" | "pull" | null>(null)
  const [syncResult, setSyncResult] = useState<any>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const handlePush = async (type: "db" | "uploads" | "all") => {
    if (!confirm(`Yakin PUSH data ${type.toUpperCase()} dari localhost ke server? Data server akan DITIMPA.`)) return
    setSyncing("push")
    setSyncResult(null)
    try {
      setSyncResult(await pushBackup.mutateAsync(type))
    } catch (err: any) {
      setSyncResult({ status: "failed", error: err?.response?.data?.error || err.message })
    } finally {
      setSyncing(null)
    }
  }

  const handlePull = async (type: "db" | "uploads" | "all") => {
    if (!confirm(`Yakin PULL data ${type.toUpperCase()} dari server? Data localhost akan DITIMPA.`)) return
    setSyncing("pull")
    setSyncResult(null)
    try {
      setSyncResult(await pullBackup.mutateAsync(type))
    } catch (err: any) {
      setSyncResult({ status: "failed", error: err?.response?.data?.error || err.message })
    } finally {
      setSyncing(null)
    }
  }

  // PLACEHOLDER: handleBackup
  const handleBackup = async (type: "db" | "uploads" | "all") => {
    setRunningBackup(true)
    setBackupResult(null)
    try {
      const res = await createBackup.mutateAsync(type)
      setBackupResult(res)
    } catch (err: any) {
      setBackupResult({ status: "failed", error: err?.response?.data?.error || err.message })
    } finally {
      setRunningBackup(false)
    }
  }

  // PLACEHOLDER: handleRestore
  const handleRestore = async (file: string, type: string) => {
    if (!confirm(`Yakin restore ${type} dari ${file}?`)) return
    try {
      const res = await restoreBackup.mutateAsync({ file, type })
      alert(res.message)
    } catch (err: any) {
      alert(err?.response?.data?.error || "Restore gagal")
    }
  }

  const handleDownload = async (filename: string) => {
    try {
      await downloadBackup.mutateAsync(filename)
    } catch (err: any) {
      alert(err?.response?.data?.error || "Download gagal")
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await uploadBackup.mutateAsync(file)
      alert(`Upload berhasil: ${file.name}`)
      e.target.value = ""
    } catch (err: any) {
      alert(err?.response?.data?.error || "Upload gagal")
    }
  }
  // PLACEHOLDER: statusCards
  const statusCards = (s: NonNullable<typeof status>) => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-600" />
            <div><p className="text-xs text-slate-500">Database</p><p className="font-bold">{s.database.size}</p><p className="text-xs text-slate-400">{s.database.name}</p></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <Upload className="w-6 h-6 text-green-600" />
            <div><p className="text-xs text-slate-500">Uploads</p><p className="font-bold">{s.uploads.size}</p><p className="text-xs text-slate-400">File storage</p></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <HardDrive className="w-6 h-6 text-orange-600" />
            <div><p className="text-xs text-slate-500">Disk</p><p className="font-bold">{s.disk.available}</p><p className="text-xs text-slate-400">Free space</p></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-purple-600" />
            <div><p className="text-xs text-slate-500">Backup Terakhir</p><p className="font-bold text-sm">{s.lastBackup || "Belum pernah"}</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
  // PLACEHOLDER: tabBackup
  // PLACEHOLDER: tabHistory
  // PLACEHOLDER: tabSync

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Backup & Sinkronisasi</h1>
      </div>

      {/* Status Cards */}
      {status && statusCards(status)}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4 pb-3">
          <button onClick={() => setActiveTab("backup")} className={`pb-2 px-4 text-sm font-medium transition-colors ${activeTab === "backup" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-600 hover:text-slate-800"}`}>Backup Sekarang</button>
          <button onClick={() => setActiveTab("history")} className={`pb-2 px-4 text-sm font-medium transition-colors ${activeTab === "history" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-600 hover:text-slate-800"}`}>Riwayat</button>
          <button onClick={() => setActiveTab("sync")} className={`pb-2 px-4 text-sm font-medium transition-colors ${activeTab === "sync" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-600 hover:text-slate-800"}`}>Sinkronisasi</button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "backup" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Backup Sekarang</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  disabled={runningBackup}
                  onClick={() => handleBackup("db")}
                  className="flex items-center gap-2"
                >
                  <Database className="w-4 h-4" />
                  {runningBackup ? "Sedang..." : "Database"}
                </Button>
                <Button
                  variant="outline"
                  disabled={runningBackup}
                  onClick={() => handleBackup("uploads")}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {runningBackup ? "Sedang..." : "Uploads"}
                </Button>
                <Button
                  variant="default"
                  disabled={runningBackup}
                  onClick={() => handleBackup("all")}
                  className="flex items-center gap-2"
                >
                  <Archive className="w-4 h-4" />
                  {runningBackup ? "Sedang..." : "Database + Uploads"}
                </Button>
              </div>

              {backupResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  backupResult.status === "success" || backupResult.status === "partial"
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
                }`}>
                  <div className="font-medium flex items-center gap-2">
                    {backupResult.status === "success" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {backupResult.status === "success" ? "Backup berhasil" : "Backup gagal"}
                  </div>
                  {backupResult.results?.map((r: any, i: number) => (
                    <div key={i} className="mt-1 ml-6">
                      {r.type}: {r.status} {r.file && `→ ${r.file}`} {r.size && `(${r.size})`}
                      {r.error && <span className="text-red-600"> — {r.details}</span>}
                    </div>
                  ))}
                  {backupResult.error && <p className="mt-1">{backupResult.error}</p>}
                </div>
              )}

              <div className="pt-4 border-t text-xs text-slate-500">
                <p>⚠️ Backup akan tersimpan di folder <code>backups/</code> di server</p>
                <p>💡 Gunakan CLI <code>bash scripts/cron-backup-webhosting.sh</code> untuk backup otomatis harian</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {activeTab === "history" && (
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Backup</CardTitle>
            <div className="flex gap-2">
              <input ref={uploadInputRef} type="file" accept=".sql.gz,.tar.gz,.gz" className="hidden" onChange={handleUpload} />
              <Button size="sm" variant="outline" onClick={() => uploadInputRef.current?.click()}>
                <span className="flex items-center gap-1"><UploadIcon className="w-3 h-4" /> Upload</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="text-center py-8 text-slate-500">Memuat...</div>
            ) : history?.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2" />
                Belum ada backup
              </div>
            ) : (
              <div className="space-y-2">
                {history?.map((f: BackupFile) => (
                  <div key={f.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {f.type === "database" ? <Database className="w-4 h-4 text-blue-500" /> : <Upload className="w-4 h-4 text-green-500" />}
                      <div>
                        <p className="font-medium text-sm">{f.name}</p>
                        <p className="text-xs text-slate-500">{f.size} · {f.modified}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleDownload(f.name)}><Download className="w-3 h-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => handleRestore(f.name, f.type === "database" ? "db" : "uploads")}>Restore</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {activeTab === "sync" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sinkronisasi Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Sinkronkan database dan file uploads antara server produksi dan localhost.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex items-center gap-2" disabled={syncing !== null} onClick={() => handlePull("all")}>
                  <Download className="w-4 h-4" />
                  {syncing === "pull" ? "Menarik..." : "Pull dari Server"}
                </Button>
                <Button variant="outline" className="flex items-center gap-2" disabled={syncing !== null} onClick={() => handlePush("all")}>
                  <UploadIcon className="w-4 h-4" />
                  {syncing === "push" ? "Mengirim..." : "Push ke Server"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => refetchHistory()}>
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>

              {syncResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  syncResult.status === "success"
                    ? "bg-green-50 text-green-800"
                    : syncResult.status === "partial"
                      ? "bg-yellow-50 text-yellow-800"
                      : "bg-red-50 text-red-800"
                }`}>
                  <div className="font-medium flex items-center gap-2">
                    {syncResult.status === "success" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {syncResult.status === "success" ? "Sinkronisasi berhasil" : syncResult.status === "partial" ? "Sinkronisasi sebagian berhasil" : "Sinkronisasi gagal"}
                  </div>
                  {syncResult.results?.map((r: any, i: number) => (
                    <div key={i} className="mt-1 ml-6">
                      {r.type}: {r.status} {r.file && `→ ${r.file}`}
                      {r.error && <span className="text-red-600"> — {r.error}</span>}
                      {r.reason && <span className="text-slate-500"> ({r.reason})</span>}
                    </div>
                  ))}
                  {syncResult.error && <p className="mt-1">{syncResult.error}</p>}
                </div>
              )}

              <div className="pt-4 border-t space-y-2 text-xs text-slate-500">
                <p>⚠️ <strong>Push</strong> akan menimpa data di server. Gunakan dengan hati-hati!</p>
                <p>💡 Backup dibuat otomatis lalu dikirim ke server lewat API. Lihat hasilnya di atas.</p>
                <p>🔧 Env vars yang dibutuhkan backend: SYNC_SERVER_URL, SYNC_OWNER_EMAIL, SYNC_OWNER_PASSWORD</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>File Backup (lokal)</CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="text-center py-4 text-slate-500">Memuat...</div>
              ) : (
                <div className="font-mono text-xs text-slate-600 space-y-1 max-h-48 overflow-y-auto">
                  {history?.slice(0, 10).map((f: BackupFile) => (
                    <div key={f.name} className="flex justify-between">
                      <span>{f.name}</span>
                      <span>{f.size}</span>
                    </div>
                  ))}
                  {history?.length === 0 && <p>Belum ada backup</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
