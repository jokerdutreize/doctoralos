import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { WLTPatient } from '../types'

interface PatientCtx {
  selected:   WLTPatient | null
  setSelected: (p: WLTPatient | null) => void
}

const Ctx = createContext<PatientCtx>({ selected: null, setSelected: () => {} })

export function PatientProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<WLTPatient | null>(null)
  return <Ctx.Provider value={{ selected, setSelected }}>{children}</Ctx.Provider>
}

export function usePatient() {
  return useContext(Ctx)
}
