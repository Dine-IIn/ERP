export interface PrioritySortableItem {
  shortage?: number;
  netShortage?: number;
  minShortage?: number;
  leadTimeDays?: number;
  totalRequired?: number;
  requiredQty?: number;
  netRemainingReq?: number;
  itemCode?: string;
  partCode?: string;
  [key: string]: any;
}

/**
 * Standard Multi-Tier Shortage & Lead Time Priority Comparator
 * 
 * Hierarchy:
 * 1. Tier 1: Active Demand Shortage (shortage > 0)
 *    - Primary: Lead Time Days (descending) -> Higher lead time = higher urgency
 *    - Tie-Breaker 1: Active Shortage Qty (descending) -> Higher shortage = higher urgency
 *    - Tie-Breaker 2: Min Level Shortage Qty (descending)
 *    - Tie-Breaker 3: Item Code (alphabetical A-Z)
 * 
 * 2. Tier 2: Safety Buffer / Min Level Shortage (minShortage > 0, shortage == 0)
 *    - Primary: Lead Time Days (descending)
 *    - Tie-Breaker 1: Min Level Shortage Qty (descending)
 *    - Tie-Breaker 2: Item Code (alphabetical A-Z)
 * 
 * 3. Tier 3: Sufficient Stock / No Shortage (shortage == 0, minShortage == 0)
 *    - Primary: Lead Time Days (descending)
 *    - Tie-Breaker 1: Total Required Demand / Qty (descending)
 *    - Tie-Breaker 2: Item Code (alphabetical A-Z)
 */
export const compareItemPriority = (a: PrioritySortableItem, b: PrioritySortableItem): number => {
  const shortageA = Math.max(0, a.shortage ?? a.netShortage ?? 0);
  const shortageB = Math.max(0, b.shortage ?? b.netShortage ?? 0);
  const minShortA = Math.max(0, a.minShortage ?? 0);
  const minShortB = Math.max(0, b.minShortage ?? 0);
  const ltA = a.leadTimeDays ?? 0;
  const ltB = b.leadTimeDays ?? 0;

  // Group 1: Active Demand Shortage
  const hasShortageA = shortageA > 0 ? 1 : 0;
  const hasShortageB = shortageB > 0 ? 1 : 0;
  if (hasShortageB !== hasShortageA) {
    return hasShortageB - hasShortageA;
  }

  if (hasShortageA && hasShortageB) {
    // Both have active shortage:
    // 1. Higher lead time = higher priority
    if (ltB !== ltA) return ltB - ltA;
    // 2. Equal lead time: Higher active shortage = higher priority
    if (shortageB !== shortageA) return shortageB - shortageA;
    // 3. Equal active shortage: Higher min level shortage = higher priority
    if (minShortB !== minShortA) return minShortB - minShortA;
    // 4. Alphabetical tie-breaker
    return (a.itemCode || '').localeCompare(b.itemCode || '');
  }

  // Group 2: Min Level Shortage (when no active shortage)
  const hasMinShortA = minShortA > 0 ? 1 : 0;
  const hasMinShortB = minShortB > 0 ? 1 : 0;
  if (hasMinShortB !== hasMinShortA) {
    return hasMinShortB - hasMinShortA;
  }

  if (hasMinShortA && hasMinShortB) {
    // Both have min level shortage:
    // 1. Higher lead time = higher priority
    if (ltB !== ltA) return ltB - ltA;
    // 2. Equal lead time: Higher min level shortage = higher priority
    if (minShortB !== minShortA) return minShortB - minShortA;
    // 3. Alphabetical tie-breaker
    return (a.itemCode || '').localeCompare(b.itemCode || '');
  }

  // Group 3: No Shortage & No Min Level Shortage
  // 1. Higher lead time = higher priority
  if (ltB !== ltA) return ltB - ltA;

  // 2. Total Demand / Required Qty tie-breaker
  const reqA = a.totalRequired ?? a.requiredQty ?? a.netRemainingReq ?? 0;
  const reqB = b.totalRequired ?? b.requiredQty ?? b.netRemainingReq ?? 0;
  if (reqB !== reqA) return reqB - reqA;

  // 3. Alphabetical tie-breaker
  return (a.itemCode || '').localeCompare(b.itemCode || '');
};
