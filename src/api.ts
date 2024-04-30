import { ModelSpec } from "@thi.ng/webgl";

export interface AppCtx {
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  mainQuad: ModelSpec;
}
