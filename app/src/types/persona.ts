export interface TargetDateAllocation {
  type: 'target_date'
  target_date_vintage: number
}

export interface CustomAllocation {
  type: 'custom'
  stock_pct: number
  bond_pct: number
  cash_pct: number
}

export type AssetAllocation = TargetDateAllocation | CustomAllocation

export interface Persona {
  id: string
  name: string
  label: string
  age: number
  tenure_years: number
  salary: number
  deferral_rate: number
  current_balance: number
  allocation: AssetAllocation
  include_social_security: boolean
  ss_claiming_age: number
  hidden: boolean
}
