import { BOM, BOMComponent } from '../types/erp';

export interface IndentedBOMNode {
  level: number;
  itemId: string;
  itemCode: string;
  itemName: string;
  subAssemblyTag: string;
  qtyPerMachine: number;
  unit: string;
  isSubAssembly: boolean;
  indentPrefix: string;
}

export interface ExplodedBOMItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  subAssemblyTag: string;
  totalQty: number;
  unit: string;
}

/**
 * Checks if adding candidateItemName into targetMachineModel creates a circular dependency loop (e.g. A inside A or A -> B -> A).
 */
export const isCircularDependency = (
  targetMachineModel: string,
  candidateItemName: string,
  allBOMs: BOM[],
  visited = new Set<string>()
): boolean => {
  if (!targetMachineModel || !candidateItemName) return false;

  const targetNorm = targetMachineModel.trim().toLowerCase();
  const candNorm = candidateItemName.trim().toLowerCase();

  // Direct self-reference
  if (targetNorm === candNorm) return true;

  if (visited.has(candNorm)) return false;
  visited.add(candNorm);

  // Check if candidateItemName has its own BOM
  const childBOM = allBOMs.find(b => b.machineModel.trim().toLowerCase() === candNorm);
  if (!childBOM) return false;

  // Recursively check all child components of the candidate BOM
  for (const comp of childBOM.components) {
    if (isCircularDependency(targetMachineModel, comp.itemName, allBOMs, new Set(visited))) {
      return true;
    }
  }

  return false;
};

/**
 * Recursively builds an indented multi-level tree for a BOM.
 */
export const getIndentedBOMTree = (
  compList: BOMComponent[],
  allBOMs: BOM[],
  level = 1,
  visited = new Set<string>()
): IndentedBOMNode[] => {
  const result: IndentedBOMNode[] = [];

  compList.forEach((c) => {
    const childNorm = c.itemName.trim().toLowerCase();
    const childBOM = allBOMs.find(b => b.machineModel.trim().toLowerCase() === childNorm);
    const isSubAssembly = !!childBOM;

    let prefix = '';
    if (level === 1) prefix = '├─ ';
    else if (level === 2) prefix = '│  ├─ ';
    else if (level === 3) prefix = '│  │  ├─ ';
    else prefix = `${'│  '.repeat(level - 1)}├─ `;

    result.push({
      level,
      itemId: c.itemId,
      itemCode: c.itemCode,
      itemName: c.itemName,
      subAssemblyTag: c.subAssemblyTag,
      qtyPerMachine: c.qtyPerMachine,
      unit: c.unit,
      isSubAssembly,
      indentPrefix: prefix
    });

    // If this component is a sub-assembly and not visited yet in this branch, expand its child components
    if (childBOM && !visited.has(childNorm)) {
      const nextVisited = new Set(visited);
      nextVisited.add(childNorm);
      const childTree = getIndentedBOMTree(childBOM.components, allBOMs, level + 1, nextVisited);
      result.push(...childTree);
    }
  });

  return result;
};

/**
 * Recursively flattens and explodes a BOM down to raw material components across all nested levels.
 */
export const getExplodedBOMSummary = (
  compList: BOMComponent[],
  allBOMs: BOM[],
  parentScaleFactor = 1,
  visited = new Set<string>(),
  accumulatorMap = new Map<string, ExplodedBOMItem>()
): ExplodedBOMItem[] => {
  compList.forEach((c) => {
    const childNorm = c.itemName.trim().toLowerCase();
    const childBOM = allBOMs.find(b => b.machineModel.trim().toLowerCase() === childNorm);
    const scaledQty = c.qtyPerMachine * parentScaleFactor;

    if (childBOM && !visited.has(childNorm)) {
      // Recurse into sub-assembly BOM
      const nextVisited = new Set(visited);
      nextVisited.add(childNorm);
      getExplodedBOMSummary(childBOM.components, allBOMs, scaledQty, nextVisited, accumulatorMap);
    } else {
      // Aggregate component
      const key = c.itemId || c.itemCode || c.itemName;
      const existing = accumulatorMap.get(key);
      if (existing) {
        existing.totalQty += scaledQty;
      } else {
        accumulatorMap.set(key, {
          itemId: c.itemId,
          itemCode: c.itemCode,
          itemName: c.itemName,
          subAssemblyTag: c.subAssemblyTag,
          totalQty: scaledQty,
          unit: c.unit
        });
      }
    }
  });

  return Array.from(accumulatorMap.values());
};
