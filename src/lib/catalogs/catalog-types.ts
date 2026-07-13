import { ModifierOption } from '@/types/game';

export interface CatalogItem {
  name: string;
  cost: string;
  description: string;
  isModular?: boolean;
  baseCostPt?: number;
  modifiers?: ModifierOption[];
}

export interface UniqueAdvantageCatalogItem {
  name: string;
  type: string;
  cost: number;
  benefits: string;
  drawbacks: string;
}
