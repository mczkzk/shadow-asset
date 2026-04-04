import { invoke } from "@tauri-apps/api/core";
import type { Account, Holding, PortfolioData, Snapshot } from "./types";

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
  as_of: string | null;
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
  as_of: string | null;
  monthly_amount: number | null;
}): Promise<void> {
  return invoke("update_holding", { request });
}

export function deleteHolding(id: number): Promise<void> {
  return invoke("delete_holding", { id });
}

// Portfolio
export function fetchPortfolio(): Promise<PortfolioData> {
  return invoke("fetch_portfolio");
}

// Snapshots
export function getSnapshots(days?: number): Promise<Snapshot[]> {
  return invoke("get_snapshots", { days });
}
