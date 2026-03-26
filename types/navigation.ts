import type { RankedStation } from './station';

export type RootStackParamList = {
  Home: undefined;
  Calculator: { referencePricePerLiter?: number } | undefined;
  StationDetail: { station: RankedStation };
};
