// Compatibility shim for @skeletonlabs/skeleton-react
// Maps existing Skeleton v4 component names to standard HTML/React patterns

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Dialog, DialogContent, DialogTitleComponent, DialogDescription, DialogClose, Portal as DialogPortal } from '@/components/ui/dialog'

// AppBar
function AppBarBase({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <div className={`flex w-full items-center justify-between gap-2 ${className}`}>{children}</div>
}

const AppBar = Object.assign(AppBarBase, {
  Lead: function Lead({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
    return <div className={`flex shrink-0 items-center justify-start ${className}`}>{children}</div>
  },
  Trail: function Trail({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
    return <div className={`flex shrink-0 items-center justify-end gap-2 ${className}`}>{children}</div>
  },
  Title: function Title({ children }: { children?: React.ReactNode }) {
    return <span className="font-semibold">{children}</span>
  },
  Toolbar: function Toolbar({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
    return <div className={`flex w-full items-center justify-between gap-2 ${className}`}>{children}</div>
  },
})

export { AppBar }

// Dialog
export { Dialog, DialogContent, DialogTitleComponent as DialogTitle, DialogDescription, DialogClose }

// Add CloseTrigger as an alias for DialogClose for compatibility
Dialog.CloseTrigger = DialogClose

// Portal - custom implementation
export function Portal({ children }: { children?: React.ReactNode }) {
  if (typeof document === 'undefined') return null
  const ref = React.useRef<HTMLDivElement | null>(null)
  if (!ref.current) {
    ref.current = document.createElement('div')
    document.body.appendChild(ref.current)
  }
  return ReactDOM.createPortal(children, ref.current)
}

// RatingGroup (simple shim)
function RatingGroupBase(props: React.ComponentProps<'div'> & { name?: string; count?: number; value?: number; onValueChange?: (details: { value: number }) => void }) {
  const { children, count, value, onValueChange, ...rest } = props
  return <div {...rest}>{children}</div>
}

const RatingGroup = Object.assign(RatingGroupBase, {
  Item: function Item(props: React.ComponentProps<'input'> & { value?: number; index?: number }) {
    return <input type="radio" {...props} />
  },
  Control: function Control({ children, className = '', ...props }: React.ComponentProps<'div'>) {
    return <div className={className} {...props}>{children}</div>
  },
  Label: function Label({ children, className = '', ...props }: React.ComponentProps<'label'>) {
    return <label className={className} {...props}>{children}</label>
  },
  Indicator: function Indicator({ children, className = '', ...props }: React.ComponentProps<'span'>) {
    return <span className={className} {...props}>{children}</span>
  },
  HiddenInput: function HiddenInput(props: React.ComponentProps<'input'>) {
    return <input type="hidden" {...props} />
  },
})

export { RatingGroup }

// Pagination - simplified pass-through
export function Pagination({ children, className = '', count, pageSize, page, onPageChange }: {
  children?: React.ReactNode | ((pagination: { pages: { type: string; value: number }[] }) => React.ReactNode)
  className?: string
  count?: number
  pageSize?: number
  page?: number
  onPageChange?: (event: { page: number }) => void
}) {
  // If children is a function, call it with pagination context
  if (typeof children === 'function') {
    const totalPages = Math.ceil((count ?? 0) / (pageSize ?? 1))
    const pages = Array.from({ length: totalPages }, (_, i) => ({ type: 'page', value: i + 1 }))
    return <div className={`flex items-center justify-center gap-2 ${className}`}>{children({ pages })}</div>
  }
  return <div className={`flex items-center justify-center gap-2 ${className}`}>{children}</div>
}
Pagination.FirstTrigger = function FirstTrigger(props: React.ComponentProps<'button'>) {
  return <button type="button" {...props} />
}
Pagination.PrevTrigger = function PrevTrigger(props: React.ComponentProps<'button'>) {
  return <button type="button" {...props} />
}
Pagination.NextTrigger = function NextTrigger(props: React.ComponentProps<'button'>) {
  return <button type="button" {...props} />
}
Pagination.LastTrigger = function LastTrigger(props: React.ComponentProps<'button'>) {
  return <button type="button" {...props} />
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Pagination.Item = function Item(props: any) {
  return <button type="button" {...props} />
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Pagination.Ellipsis = function Ellipsis(props: any) {
  return <span {...props} />
}
Pagination.Context = function Context({ children }: { children?: (pagination: { pages: { type: string; value: number }[] }) => React.ReactNode }) {
  // This component expects a function child
  return <>{typeof children === 'function' ? children({ pages: [] }) : children}</>
}

// Steps - simplified pass-through
export function Steps({ children, className = '', step, count, linear }: {
  children?: React.ReactNode
  className?: string
  step?: number
  count?: number
  linear?: boolean
}) {
  return <div className={`w-full ${className}`}>{children}</div>
}
Steps.List = function List({ children }: { children?: React.ReactNode }) {
  return <div className="flex">{children}</div>
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Steps.Item = function Item(props: any) {
  return <div className="flex items-center gap-1" {...props} />
}
Steps.Indicator = function Indicator({ children }: { children?: React.ReactNode }) {
  return <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary-500 text-xs text-white">{children}</span>
}
Steps.Separator = function Separator() {
  return <span className="flex-1 h-0.5 bg-surface-300-700" />
}
