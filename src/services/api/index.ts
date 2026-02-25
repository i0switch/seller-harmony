import type { IPlatformApi, ISellerApi, IBuyerApi } from "../api.types";

// Import HTTP implementations
import { platformApi as platformHttp } from "./http/platform";
import { sellerApi as sellerHttp } from "./http/seller";
import { buyerApi as buyerHttp } from "./http/buyer";

// Import Mock implementations
import {
    platformApi as platformMock,
    sellerApi as sellerMock,
    buyerApi as buyerMock,
} from "./mock/index";

// Check environment variable (defaults to true if not explicitly set to false string/value)
const USE_MOCK = import.meta.env.VITE_USE_MOCK_API !== "false";

export const platformApi: IPlatformApi = USE_MOCK ? platformMock : platformHttp;
export const sellerApi: ISellerApi = USE_MOCK ? sellerMock : sellerHttp;
export const buyerApi: IBuyerApi = USE_MOCK ? buyerMock : buyerHttp;
