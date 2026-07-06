'use client'

import * as React from 'react'
import * as ReactDOM from 'react-dom'

// Base Dialog component
function DialogBase({ open, onOpenChange, children, ...props }: React.ComponentProps<'div'> & {
  open?: boolean
  onOpenChange?: (details: { open: boolean }) => void
  role?: string
  closeOnInteractOutside?: boolean
  closeOnEscape?: boolean
}) {
  const [isOpen, setIsOpen] = React.useState(open ?? false)

  React.useEffect(() => {
    if (open !== undefined) setIsOpen(open)
  }, [open])

  const handleOpenChange = (next: boolean) => {
    setIsOpen(next)
    onOpenChange?.({ open: next })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 z-[-1] bg-black/40"
        onClick={() => props.closeOnInteractOutside !== false && handleOpenChange(false)}
      />
      <div
        className="card preset-filled-surface-50-950 preset-outlined-surface-200-800 w-full max-w-md p-5 shadow-lg"
        role={props.role}
        onKeyDown={(e) => {
          if (props.closeOnEscape !== false && e.key === 'Escape') {
            handleOpenChange(false)
          }
        }}
      >
        {children}
      </div>
    </div>
  )
}

// Create the compound component
const Dialog = Object.assign(DialogBase, {
  Backdrop: function DialogBackdrop({ className = '', ...props }: React.ComponentProps<'div'>) {
    return <div className={`fixed inset-0 z-100 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className}`} {...props} />
  },
  Positioner: function DialogPositioner({ children, className = '', ...props }: React.ComponentProps<'div'>) {
    return (
      <div className={`fixed inset-0 z-100 flex items-center justify-center p-4 ${className}`} {...props}>
        {children}
      </div>
    )
  },
  Content: function DialogContent({ children, className = '', ...props }: React.ComponentProps<'div'>) {
    return (
      <div className={`card preset-filled-surface-50-950 preset-outlined-surface-200-800 w-full max-w-md p-5 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ${className}`} {...props}>
        {children}
      </div>
    )
  },
  Title: function DialogTitle({ children, className = '', ...props }: React.ComponentProps<'h2'>) {
    return (
      <h2 className={`h5 font-semibold ${className}`} {...props}>
        {children}
      </h2>
    )
  },
  Description: function DialogDescription({ children, className = '', ...props }: React.ComponentProps<'p'>) {
    return (
      <p className={`mt-3 text-sm opacity-80 ${className}`} {...props}>
        {children}
      </p>
    )
  },
  CloseTrigger: function DialogCloseTrigger({ children, disabled, ...props }: React.ComponentProps<'button'>) {
    return (
      <button type="button" disabled={disabled} className="btn btn-sm preset-outlined-surface-200-800" {...props}>
        {children}
      </button>
    )
  },
})

export { Dialog }

export function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null
  const container = document.createElement('div')
  document.body.appendChild(container)
  return ReactDOM.createPortal(children, container)
}

export function DialogBackdrop({ className = '', ...props }: React.ComponentProps<'div'>) {
  return <div className={`fixed inset-0 z-100 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className}`} {...props} />
}

export function DialogPositioner({ children, className = '', ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={`fixed inset-0 z-100 flex items-center justify-center p-4 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function DialogContentComponent({ children, className = '', ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={`card preset-filled-surface-50-950 preset-outlined-surface-200-800 w-full max-w-md p-5 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function DialogTitle({ children, className = '', ...props }: React.ComponentProps<'h2'>) {
  return (
    <h2 className={`h5 font-semibold ${className}`} {...props}>
      {children}
    </h2>
  )
}

export function DialogDescription({ children, className = '', ...props }: React.ComponentProps<'p'>) {
  return (
    <p className={`mt-3 text-sm opacity-80 ${className}`} {...props}>
      {children}
    </p>
  )
}

// Re-export as both DialogContent and DialogContentComponent for compatibility
export const DialogContent = DialogContentComponent

export const DialogCloseTrigger = DialogClose
export function DialogClose({ children, disabled, ...props }: React.ComponentProps<'button'>) {
  return (
    <button type="button" disabled={disabled} className="btn btn-sm preset-outlined-surface-200-800" {...props}>
      {children}
    </button>
  )
}
