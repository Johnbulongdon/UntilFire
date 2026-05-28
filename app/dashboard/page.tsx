"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, ReferenceLine,
  BarChart, Bar, ComposedChart, Area,
} from "recharts";
import TransactionsTab from "./TransactionsTab";
import PlaidConnect from "./PlaidConnect";
import UpgradeModal from "./UpgradeModal";
import TourModal from "./TourModal";
import CategoriesTab from "./CategoriesTab";
import RecurringTab from "./RecurringTab";
import ReportsTab from "./ReportsTab";
import ProfileTab from "./ProfileTab";
import Logo from "@/app/components/Logo";
import FeedbackWidget from "./FeedbackWidget";
import { monteCarloFIRE } from "@/lib/fire";
import { FALLBACK_RATES, convertUSDAmount, formatUSDInCurrency, getCurrencySymbol } from "@/lib/currency";
import { CITIES } from "@/lib/fire-data";
import { trackDashboardFirstView } from "@/lib/analytics";

// ─── Types ────────────────────────────────────────────────────────────────────
type Expenses = Record<string, number>;

type PlaidAccount = {
  id: string;
  plaid_account_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  balance_current: number | null;
  balance_available: number | null;
  balance_limit: number | null;
  iso_currency_code: string;
  mask: string | null;
  plaid_item_id: string;
  updated_at: string;
  apy: number | null;
};
type PlaidHolding = {
  account_id: string;
  security_id: string;
  quantity: number;
  institution_price: number | null;
  institution_value: number | null;
  cost_basis: number | null;
  iso_currency_code: string | null;
};
type PlaidSecurity = {
  security_id: string;
  name: string | null;
  ticker_symbol: string | null;
  type: string | null;
};
type TabKey =
  | "overview"
  | "cashflow"
  | "assets"
  | "liabilities"
  | "fire-calculator"
  | "goals"
  | "reports"
  | "learning-hub"
  | "profile";