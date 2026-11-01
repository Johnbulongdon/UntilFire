"use client";
import { useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { toolsRequest } from "@/lib/accounts-tools-client";
export function useToolsAPI() {
  const { user } = useAuth();
  const owner = useRef(user?.id);
  owner.current = user?.id;
  const id = user?.id;
  const api = useCallback(
    async <T>(
      path: string,
      body?: unknown,
      signal?: AbortSignal,
    ): Promise<T> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!id || owner.current !== id || session?.user.id !== id)
        throw new Error("Please sign in again.");
      if (path === "/api/offers" && body === undefined)
        await toolsRequest(
          "",
          session.access_token,
          "/api/referrals/claim",
          {},
          signal,
        );
      const data = await toolsRequest<T>(
        "",
        session.access_token,
        path,
        body,
        signal,
      );
      if (owner.current !== id)
        throw new Error("Account changed. Please refresh.");
      return data;
    },
    [id],
  );
  return { api, owner: id };
}
