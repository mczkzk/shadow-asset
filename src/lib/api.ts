import { invoke } from "@tauri-apps/api/core";
import type { Account, Holding, PortfolioData, Snapshot, MfImportPreview, MfPreviewRow, MfImportResult, ManualAsset, AllocationData } from "./types";

// Accounts
export function getAccounts(): Promise<Account[]> {
  return invoke("get_accounts");
}

export function createAccount(request: {
  name: string;
  type: string;
}): Promise<Account> {
  return invoke("create_account", { request });
}

export function updateAccount(request: {
  id: number;
  name: string;
  type: string;
  sort_order: number;
}): Promise<void> {
  return invoke("update_account", { request });
}

export function deleteAccount(id: number): Promise<void> {
  return invoke("delete_account", { id });
}

// Holdings
export function getHoldings(): Promise<Holding[]> {
  return invoke("get_holdings");
}

export function createHolding(request: {
  account_id: number;
  ticker: string;
  name: string;
  quantity: number;
  holding_type: string;
  monthly_amount: number | null;
}): Promise<Holding> {
  return invoke("create_holding", { request });
}

export function updateHolding(request: {
  id: number;
  ticker: string;
  name: string;
  quantity: number;
  holding_type: string;
  monthly_amount: number | null;
}): Promise<void> {
  return invoke("update_holding", { request });
}

export function deleteHolding(id: number): Promise<void> {
  return invoke("delete_holding", { id });
}

// Export / Import
export function exportData(path: string): Promise<void> {
  return invoke("export_data", { path });
}

export function importData(path: string): Promise<void> {
  return invoke("import_data", { path });
}

// CSV Import
export interface HoldingUpdate {
  holding_id: number;
  account_name: string;
  fund_name: string;
  old_quantity: number;
  new_quantity: number;
}

export interface UnmatchedFund {
  fund_name: string;
  section: string;
  quantity: number;
}

export interface CsvImportPreview {
  updates: HoldingUpdate[];
  unmatched: UnmatchedFund[];
}

export function previewCsvImport(path: string, broker: string): Promise<CsvImportPreview> {
  return invoke("preview_csv_import", { path, broker });
}

export function applyCsvImport(updates: HoldingUpdate[]): Promise<void> {
  return invoke("apply_csv_import", { updates });
}

// Portfolio
export function fetchPortfolio(): Promise<PortfolioData> {
  return invoke("fetch_portfolio");
}

// Snapshots
export function getSnapshots(days?: number): Promise<Snapshot[]> {
  return invoke("get_snapshots", { days });
}

// MoneyForward CSV Import
export function previewMfImport(path: string): Promise<MfImportPreview> {
  return invoke("preview_mf_import", { path });
}

export function applyMfImport(rows: MfPreviewRow[]): Promise<MfImportResult> {
  return invoke("apply_mf_import", { rows });
}

// Allocation
export function fetchAllocation(): Promise<AllocationData> {
  return invoke("fetch_allocation");
}

// Manual Assets
export function getManualAssets(): Promise<ManualAsset[]> {
  return invoke("get_manual_assets");
}

export function createManualAsset(request: Omit<ManualAsset, "id">): Promise<ManualAsset> {
  return invoke("create_manual_asset", { request });
}

export function updateManualAsset(request: ManualAsset): Promise<void> {
  return invoke("update_manual_asset", { request });
}

export function deleteManualAsset(id: number): Promise<void> {
  return invoke("delete_manual_asset", { id });
}

// Settings
export function getSetting(key: string): Promise<string | null> {
  return invoke("get_setting", { key });
}

export function setSetting(key: string, value: string): Promise<void> {
  return invoke("set_setting", { key, value });
}
