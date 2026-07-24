'use client'

import type { ReactNode } from 'react'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { getFederationDisplayName } from '../lib/federation-context'

type WorkhouseDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
}

function WorkhouseDrawer({ open, onOpenChange, title, children }: WorkhouseDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="workhouse-surface flex h-full w-full max-w-md flex-col border-surface-300-700 bg-surface-50-950 data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-md">
        <DrawerHeader className="shrink-0 flex-row items-center justify-between gap-2 border-b border-surface-300-700 p-4 text-left">
          <DrawerTitle className="h5 font-semibold">{title}</DrawerTitle>
          <DrawerClose className="btn btn-sm border-2 bg-transparent border-surface-600 text-surface-800 hover:bg-surface-100 dark:border-surface-300 dark:text-surface-50 dark:hover:bg-surface-900">Close</DrawerClose>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </DrawerContent>
    </Drawer>
  )
}

export function BalanceDrawer({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <WorkhouseDrawer open={open} onOpenChange={onOpenChange} title="Personal Activity">
      {children}
    </WorkhouseDrawer>
  )
}

export function FederationDataDrawer({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <WorkhouseDrawer open={open} onOpenChange={onOpenChange} title={getFederationDisplayName()}>
      {children}
    </WorkhouseDrawer>
  )
}

export function OfferDrawer({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <WorkhouseDrawer open={open} onOpenChange={onOpenChange} title="Offer exchange">
      {children}
    </WorkhouseDrawer>
  )
}

export function HelpDrawer({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <WorkhouseDrawer open={open} onOpenChange={onOpenChange} title="Stay in touch">
      {children}
    </WorkhouseDrawer>
  )
}

export function MenuDrawer({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <WorkhouseDrawer open={open} onOpenChange={onOpenChange} title="Information and Support">
      {children}
    </WorkhouseDrawer>
  )
}
