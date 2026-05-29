"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { gsap } from "gsap";
import Link from "next/link";
import Logo from "@/app/components/Logo";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { saveCalculatorPrefill } from "@/lib/journey";
import { calcFIRE, calcTakeHome } from "@/lib/fire";
import {
  trackLandingViewed,
  trackCalculatorStepViewed,
  trackCalculatorRevealed,
  trackResultShareOpened,
  trackResultShareCompleted,
  trackResultSaveClicked,
  trackResultEmailCaptured,
} from "@/lib/analytics";
import type { CalculatorStepId } from "@/lib/analytics-events";
import {
  getAcquisitionSource,
  normaliseAcquisitionSource,
  setAcquisitionSource,
} from "@/lib/acquisition";
import Nav from "@/app/components/landing/Nav";
import WizardProgress from "@/app/components/landing/WizardProgress";
import LandingPage from "@/app/components/landing/LandingPage";
import CityScreen, { type CityState } from "@/app/components/landing/CityScreen";
import {
  CURRENCY_NAMES,
  FALLBACK_RATES,
  SUPPORTED_CURRENCIES,
  getCurrencySymbol,
  type SupportedCurrency,
} from "@/lib/currency";