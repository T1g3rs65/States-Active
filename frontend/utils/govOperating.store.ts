export const NONE = 'None (clean result)';
export const UNITARY = 'unitary';

export type StyleMap = Record<string, string>;
export type TerrMap = Record<string, StyleMap>;

export const HUMAN: Record<string, TerrMap> = {};
export const ZYTHERA: Record<string, TerrMap> = {};

export function put(
  table: Record<string, TerrMap>,
  subtype: string,
  terr: string,
  style: string,
  text: string,
) {
  if (!table[subtype]) table[subtype] = {};
  if (!table[subtype][terr]) table[subtype][terr] = {};
  table[subtype][terr][style] = text;
}
