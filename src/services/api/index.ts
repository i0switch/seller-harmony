import type { IPlatformApi, ISellerApi, IBuyerApi } from "../api.types";

import { platformApi as platformHttp } from "./http/platform";
import { sellerApi as sellerHttp } from "./http/seller";
import { buyerApi as buyerHttp } from "./http/buyer";

export const platformApi: IPlatformApi = platformHttp;
export const sellerApi: ISellerApi = sellerHttp;
export const buyerApi: IBuyerApi = buyerHttp;
