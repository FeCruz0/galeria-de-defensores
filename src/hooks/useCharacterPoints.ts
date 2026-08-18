import { useMemo } from 'react';
import { Character } from '../types/game';
import { computedCostPt, getModifiedAttributes, getEquippedItemsModifiers } from '../lib/rules';

export function useCharacterPoints(character: Character) {
  return useMemo(() => {
    const equippedModifiers = getEquippedItemsModifiers(character.inventory || []);
    const modifiedAttrs = getModifiedAttributes(character.attributes_values, [], equippedModifiers);

    const attributesSum = Object.values(character.attributes_values).reduce((sum, val) => sum + (val || 0), 0);
    const advantagesSum = (character.advantages || []).reduce((sum, item) => sum + computedCostPt(item), 0);
    const disadvantagesSum = (character.disadvantages || []).reduce((sum, item) => sum + computedCostPt(item), 0);
    const skillsSum = (character.skills || []).reduce((sum, item) => sum + computedCostPt(item), 0);
    const specializationsSum = Math.floor((character.specializations?.length || 0) / 3);
    const uniqueAdvantageCost = character.unique_advantage?.cost || 0;

    const pointsSpent = attributesSum + advantagesSum + disadvantagesSum + skillsSum + specializationsSum + uniqueAdvantageCost;
    const pointsAvailable = character.saved_points || 0;
    const pointsTotal = pointsSpent + pointsAvailable;
    const scoreSpent = pointsTotal;
    const isOverflow = pointsAvailable < 0;

    return {
      equippedModifiers,
      modifiedAttrs,
      attributesSum,
      advantagesSum,
      disadvantagesSum,
      skillsSum,
      specializationsSum,
      uniqueAdvantageCost,
      pointsSpent,
      pointsAvailable,
      pointsTotal,
      scoreSpent,
      isOverflow
    };
  }, [character]);
}
