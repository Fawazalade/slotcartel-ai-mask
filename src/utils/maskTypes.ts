export interface MaskDefinition {
  id: string;
  name: string;
  boundaryLandmarks: number[];
  cutouts: number[][];
}

// Full face boundary — forehead to jaw, ear to ear
const FULL_FACE = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];

// Left eye hole
const LEFT_EYE = [33,246,161,160,159,158,157,173,133,155,154,153,145,144,163,7];

// Right eye hole
const RIGHT_EYE = [362,398,384,385,386,387,388,466,263,249,390,373,374,380,381,382];

// Mouth hole
const MOUTH = [61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146];

export const MASK_DEFINITION: MaskDefinition = {
  id: 'hood',
  name: 'Full Hood',
  boundaryLandmarks: FULL_FACE,
  cutouts: [LEFT_EYE, RIGHT_EYE, MOUTH],
};

// Keep as array for compatibility with page.tsx
export const MASK_DEFINITIONS: MaskDefinition[] = [MASK_DEFINITION];
