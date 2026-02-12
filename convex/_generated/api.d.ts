/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as companyCosts from "../companyCosts.js";
import type * as companyWarehouses from "../companyWarehouses.js";
import type * as costSettings from "../costSettings.js";
import type * as factories from "../factories.js";
import type * as factoryCostItems from "../factoryCostItems.js";
import type * as factoryPresets from "../factoryPresets.js";
import type * as seed from "../seed.js";
import type * as shippingCompanies from "../shippingCompanies.js";
import type * as shippingRateTypes from "../shippingRateTypes.js";
import type * as shippingRates from "../shippingRates.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  companyCosts: typeof companyCosts;
  companyWarehouses: typeof companyWarehouses;
  costSettings: typeof costSettings;
  factories: typeof factories;
  factoryCostItems: typeof factoryCostItems;
  factoryPresets: typeof factoryPresets;
  seed: typeof seed;
  shippingCompanies: typeof shippingCompanies;
  shippingRateTypes: typeof shippingRateTypes;
  shippingRates: typeof shippingRates;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
