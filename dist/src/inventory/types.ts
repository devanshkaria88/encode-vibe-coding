import { BillboardSlot } from '../core/model';

export interface SpatialBillboardSlot extends BillboardSlot {
  readonly lat: number;
  readonly lon: number;
}

export interface OverpassElement {
  type: 'node' | 'way';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    name?: string;
    'advertising'?: string;
    'height'?: string;
    'width'?: string;
    [key: string]: string | undefined;
  };
}

export interface OverpassResponse {
  elements: OverpassElement[];
}