import { $x, $y, FloatSym, V2, Vec2Sym, add, defn, div, lt, mul, ret, sub, sym, ternary, vec2 } from "@thi.ng/shader-ast";

export const coverImage = defn(
    V2,
    "coverImage",
    [V2, V2, V2],
    (uv, screenResolution, imageResolution) => {
      let s: Vec2Sym;
      let i: Vec2Sym;
  
      let rs: FloatSym;
      let ri: FloatSym;
  
      let st: Vec2Sym;
      let o: Vec2Sym;
  
      return [
        (s = sym(screenResolution)),
        (i = sym(imageResolution)),
        (rs = sym(div($x(s), $y(s)))),
        (ri = sym(div($x(i), $y(i)))),
        (st = sym(
          ternary(
            lt(rs, ri),
            vec2(div(mul($x(i), $y(s)), $y(i)), $y(s)),
            vec2($x(s), div(mul($x(s), $y(i)), $x(i)))
          )
        )),
        (o = sym(
          div(
            ternary(
              lt(rs, ri),
              vec2(div(sub($x(st), $x(s)), 2), 0),
              vec2(0, div(sub($y(st), $y(s)), 2))
            ),
            st
          )
        )),
        ret(add(div(mul(uv, screenResolution), st), o)),
      ];
    }
  );