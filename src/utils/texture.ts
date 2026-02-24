export interface TextureData {
  baseColor: Uint8Array;
  normalMap: Uint8Array;
  roughnessMap: Uint8Array;
  metalnessMap: Uint8Array;
  width: number;
  height: number;
}
