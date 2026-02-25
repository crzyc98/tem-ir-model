export interface AssetClassReturn {
  expected_return: number
  standard_deviation: number
}

export interface Assumptions {
  inflation_rate: number
  wage_growth_rate: number
  wage_growth_std: number
  equity: AssetClassReturn
  intl_equity: AssetClassReturn
  fixed_income: AssetClassReturn
  cash: AssetClassReturn
  comp_limit: number
  deferral_limit: number
  additions_limit: number
  catchup_limit: number
  super_catchup_limit: number
}

export interface AssetClassReturnOverride {
  expected_return: number | null
  standard_deviation: number | null
}

export interface AssumptionsOverride {
  inflation_rate: number | null
  wage_growth_rate: number | null
  wage_growth_std: number | null
  equity: AssetClassReturnOverride | null
  intl_equity: AssetClassReturnOverride | null
  fixed_income: AssetClassReturnOverride | null
  cash: AssetClassReturnOverride | null
  comp_limit: number | null
  deferral_limit: number | null
  additions_limit: number | null
  catchup_limit: number | null
  super_catchup_limit: number | null
}
