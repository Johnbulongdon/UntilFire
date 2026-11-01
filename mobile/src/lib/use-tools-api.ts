import { useCallback, useRef } from "react";
import { toolsRequest } from "@engine/accounts-tools-client.ts";
import { useAuth } from "@/state/auth";
export const TOOLS_SITE = "https://www.untilfire.com";
export function useToolsAPI() {
  const { session } = useAuth();
  const identity = session?.user.id;
  const token = session?.access_token;
  const current = useRef({ identity, token });
  current.current = { identity, token };
  const api = useCallback(
    async <T>(
      path: string,
      body?: unknown,
      signal?: AbortSignal,
    ): Promise<T> => {
      if (
        !token ||
        !identity ||
        current.current.identity !== identity ||
        current.current.token !== token
      )
        throw new Error("Please sign in again.");
      const data = await toolsRequest<T>(TOOLS_SITE, token, path, body, signal);
      if (
        current.current.identity !== identity ||
        current.current.token !== token
      )
        throw new Error("Account changed. Please refresh.");
      return data;
    },
    [identity, token],
  );
  return { api, owner: identity };
}
