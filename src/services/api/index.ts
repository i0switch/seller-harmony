import type { IPlatformApi, ISellerApi, IBuyerApi } from "../api.types";

import { platformApi as platformHttp } from "./http/platform";
// Seller API now uses Supabase-direct implementation instead of HTTP (localhost:8000)
import { sellerApi as sellerSupabase } from "./supabase/seller";
// Buyer API now uses Supabase-direct implementation instead of HTTP (localhost:8000)
import { buyerApi as buyerSupabase } from "./supabase/buyer";

export const platformApi: IPlatformApi = platformHttp;
export const sellerApi: ISellerApi = sellerSupabase;
export const buyerApi: IBuyerApi = buyerSupabase;
