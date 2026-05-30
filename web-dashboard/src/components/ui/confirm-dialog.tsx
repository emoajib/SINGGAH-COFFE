import { AlertTriangle } from "lucide-react"
import { Dialog } from "./dialog"
import { Button } from "./button"

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description?: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  cancelLabel?: string
  variant?: "destructive" | "primary"
  isLoading?: boolean
}

function ConfirmDialog({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-3">
        <div
          className={`rounded-full p-2 ${
            variant === "destructive" ? "bg-destructive/10" : "bg-primary/10"
          }`}
        >
          <AlertTriangle
            className={`h-5 w-5 ${
              variant === "destructive" ? "text-destructive" : "text-primary"
            }`}
          />
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Dialog>
  )
}

export { ConfirmDialog }
