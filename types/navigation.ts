import type { RankedStation } from './station';

export type RootStackParamList = {
  Terms: undefined;
  Home: undefined;
  Calculator: { referencePricePerLiter?: number } | undefined;
  StationDetail: { station: RankedStation };
};
