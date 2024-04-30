import { $x, $y, FloatSym, Vec3Sym, add, assign, cos, defMain, div, float, length, mix, mul, sin, sub, sym, texture, vec3 } from "@thi.ng/shader-ast";
import { ShaderFn } from "@thi.ng/webgl";
import { coverImage } from "./coverImage";
import { transformMVP } from "@thi.ng/shader-ast-stdlib";

export const vertexShaderFn: ShaderFn = (gl, unis, ins, outs) => [
  defMain(() => {
    let pos: Vec3Sym;
    let angle: FloatSym;
    let wave: FloatSym;
    let c: FloatSym;

    return [
      (pos = sym(vec3(ins.position, 1))),
      (angle = sym(div(mul(unis.progress, 3.14159265), 2))),
      (wave = sym(cos(angle))),
      (c = sym(
        add(
          mul(
            sin(add(mul(length(sub(ins.uv, 0.5)), 15), mul(unis.progress, 12))),
            0.5
          ),
          0.5
        )
      )),
      assign(
        $x(pos),
        mul(
          $x(pos),
          mix(
            float(1),
            add(float($x(unis.zoomScale)), mul(wave, c)),
            unis.progress
          )
        )
      ),
      assign(
        $y(pos),
        mul(
          $y(pos),
          mix(
            float(1),
            add(float($y(unis.zoomScale)), mul(wave, c)),
            unis.progress
          )
        )
      ),

      assign(outs.v_uv, ins.uv),
      assign(
        gl.gl_Position,
        transformMVP(pos, unis.model, unis.view, unis.proj)
      ),
    ];
  }),
];
export const fragmentShaderFn: ShaderFn = (_, unis, ins, outs) => [
  defMain(() => {
    return [
      assign(
        outs.fragColor,
        texture(unis.tex, coverImage(ins.v_uv, unis.resolution, unis.imageRes))
      ),
    ];
  }),
];
