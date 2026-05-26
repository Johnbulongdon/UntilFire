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