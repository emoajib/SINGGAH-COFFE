import { createPortal } from "react-dom"
import { Toast } from "./toast"
import { useToast } from "../../hooks/use-toast"

function Toaster() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return createPortal(
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          title={t.title}
          description={t.description}
          variant={t.variant}
          onClose={() => dismiss(t.id)}
        />
      ))}
    </div>,
    document.body
  )
}

export { Toaster }
