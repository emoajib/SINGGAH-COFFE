import * as React from "react"
import { X } from "lucide-react"
import { Button } from "./button"

interface DialogProps {
    isOpen: boolean
    onClose: () => void
    title: string
    description?: string
    children: React.ReactNode
    footer?: React.ReactNode
}

export function Dialog({ isOpen, onClose, title, description, children, footer }: DialogProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 transition-opacity"
                onClick={onClose}
            />

            {/* Dialog Content */}
            <div className="relative z-50 w-full max-w-lg transform rounded-lg bg-white p-6 shadow-xl transition-all sm:w-full">
                <div className="flex items-center justify-between mb-4">
                    <div className="space-y-1.5">
                        <h3 className="text-lg font-semibold leading-none tracking-tight">{title}</h3>
                        {description && (
                            <p className="text-sm text-muted-foreground">{description}</p>
                        )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="py-4">
                    {children}
                </div>

                {footer && (
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )
}
