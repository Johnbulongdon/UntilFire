"use client";
import { createContext } from 'react';
/** Explicit opt-in in the approval preview only. Production defaults to system. */
export const MotionPreviewPreference = createContext(false);
