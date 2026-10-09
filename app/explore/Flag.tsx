"use client";

/**
 * Drawn flags for Explore. Windows has no flag emoji: 🇺🇸 shows as the
 * letters "US", so the city data's emoji flags are turned into SVGs from
 * country-flag-icons (MIT), one import per country the city list uses.
 */
import AE from "country-flag-icons/string/3x2/AE";
import AR from "country-flag-icons/string/3x2/AR";
import AT from "country-flag-icons/string/3x2/AT";
import AU from "country-flag-icons/string/3x2/AU";
import BE from "country-flag-icons/string/3x2/BE";
import BG from "country-flag-icons/string/3x2/BG";
import BR from "country-flag-icons/string/3x2/BR";
import CA from "country-flag-icons/string/3x2/CA";
import CH from "country-flag-icons/string/3x2/CH";
import CL from "country-flag-icons/string/3x2/CL";
import CN from "country-flag-icons/string/3x2/CN";
import CO from "country-flag-icons/string/3x2/CO";
import CR from "country-flag-icons/string/3x2/CR";
import CZ from "country-flag-icons/string/3x2/CZ";
import DE from "country-flag-icons/string/3x2/DE";
import DK from "country-flag-icons/string/3x2/DK";
import EE from "country-flag-icons/string/3x2/EE";
import EG from "country-flag-icons/string/3x2/EG";
import ES from "country-flag-icons/string/3x2/ES";
import FI from "country-flag-icons/string/3x2/FI";
import FR from "country-flag-icons/string/3x2/FR";
import GB from "country-flag-icons/string/3x2/GB";
import GE from "country-flag-icons/string/3x2/GE";
import GH from "country-flag-icons/string/3x2/GH";
import GR from "country-flag-icons/string/3x2/GR";
import HK from "country-flag-icons/string/3x2/HK";
import HR from "country-flag-icons/string/3x2/HR";
import HU from "country-flag-icons/string/3x2/HU";
import ID from "country-flag-icons/string/3x2/ID";
import IE from "country-flag-icons/string/3x2/IE";
import IL from "country-flag-icons/string/3x2/IL";
import IN from "country-flag-icons/string/3x2/IN";
import IT from "country-flag-icons/string/3x2/IT";
import JP from "country-flag-icons/string/3x2/JP";
import KE from "country-flag-icons/string/3x2/KE";
import KH from "country-flag-icons/string/3x2/KH";
import KR from "country-flag-icons/string/3x2/KR";
import LT from "country-flag-icons/string/3x2/LT";
import LV from "country-flag-icons/string/3x2/LV";
import MA from "country-flag-icons/string/3x2/MA";
import MO from "country-flag-icons/string/3x2/MO";
import MX from "country-flag-icons/string/3x2/MX";
import MY from "country-flag-icons/string/3x2/MY";
import NG from "country-flag-icons/string/3x2/NG";
import NL from "country-flag-icons/string/3x2/NL";
import NO from "country-flag-icons/string/3x2/NO";
import NZ from "country-flag-icons/string/3x2/NZ";
import PA from "country-flag-icons/string/3x2/PA";
import PE from "country-flag-icons/string/3x2/PE";
import PH from "country-flag-icons/string/3x2/PH";
import PL from "country-flag-icons/string/3x2/PL";
import PT from "country-flag-icons/string/3x2/PT";
import QA from "country-flag-icons/string/3x2/QA";
import RO from "country-flag-icons/string/3x2/RO";
import RS from "country-flag-icons/string/3x2/RS";
import SA from "country-flag-icons/string/3x2/SA";
import SE from "country-flag-icons/string/3x2/SE";
import SG from "country-flag-icons/string/3x2/SG";
import SI from "country-flag-icons/string/3x2/SI";
import TH from "country-flag-icons/string/3x2/TH";
import TR from "country-flag-icons/string/3x2/TR";
import TW from "country-flag-icons/string/3x2/TW";
import US from "country-flag-icons/string/3x2/US";
import UY from "country-flag-icons/string/3x2/UY";
import VN from "country-flag-icons/string/3x2/VN";
import ZA from "country-flag-icons/string/3x2/ZA";

const SVG: Record<string, string> = { AE, AR, AT, AU, BE, BG, BR, CA, CH, CL, CN, CO, CR, CZ, DE, DK, EE, EG, ES, FI, FR, GB, GE, GH, GR, HK, HR, HU, ID, IE, IL, IN, IT, JP, KE, KH, KR, LT, LV, MA, MO, MX, MY, NG, NL, NO, NZ, PA, PE, PH, PL, PT, QA, RO, RS, SA, SE, SG, SI, TH, TR, TW, US, UY, VN, ZA };

/** "🇵🇹" → "PT". */
const codeOf = (emoji: string) => [...emoji].map(ch => ch.codePointAt(0)!).filter(cp => cp >= 0x1f1e6 && cp <= 0x1f1ff).map(cp => String.fromCharCode(cp - 0x1f1e6 + 65)).join("");

export default function Flag({ emoji, size = 14 }: { emoji: string; size?: number }) {
  const svg = SVG[codeOf(emoji)];
  if (!svg) return null;
  return <span aria-hidden style={{ display: "inline-block", width: Math.round(size * 1.5), height: size, verticalAlign: "-2px", borderRadius: 2,
    boxShadow: "0 0 0 0.5px #0003", background: `center / cover no-repeat url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")` }} />;
}
