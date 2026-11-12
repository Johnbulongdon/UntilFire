import { NextRequest } from "next/server";
import { directoryAccounts } from "@/lib/accounts-directory";
import { providerAuth, reply, apiFailure } from "@/lib/provider-api";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
    try {
        await providerAuth(req);
        return reply({ accounts: directoryAccounts() });
    }
    catch (error) {
        return apiFailure(error);
    }
}
