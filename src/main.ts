import './style.css';

import { clamp, fit, mix } from "@thi.ng/math";
import { lookAt, perspective } from "@thi.ng/matrices";
import { imageFromURL } from "@thi.ng/pixel";
import { fromRAF } from "@thi.ng/rstream";
import { gestureStream } from "@thi.ng/rstream-gestures";
import { Node3D } from "@thi.ng/scenegraph";
import { V2 } from "@thi.ng/shader-ast";
import { repeatedly } from "@thi.ng/transducers";
import { setC } from "@thi.ng/vectors";
import {
  GLMat4,
  ModelSpec,
  TextureFilter,
  TextureRepeat,
  clearCanvas,
  compileModel,
  defShader,
  defTexture,
  glCanvas,
} from "@thi.ng/webgl";

import { setup, createActor, assign } from "xstate";
import { onlyClicks } from "./onlyClicks";
import { buildPlane } from "./buildPlane";
import { AppCtx } from "./api";
import { fragmentShaderFn, vertexShaderFn } from "./shaders";
import { Slide } from "./slide";

const BG_DARK = [0.015, 0.011764705882352941, 0.011764705882352941, 1];
const BG_COL = BG_DARK;

const W = window.innerWidth;
const H = window.innerHeight;

const SLIDE_W = 200;
const SLIDE_H = 460;

const CAMERA_FOV = 45;
const CAMERA_Z = (H / Math.tan((CAMERA_FOV * Math.PI) / 360)) * 0.5;
// const CAMERA_Z = 3000;
// const CAMERA_ASPECT = W / H;
// const CAMERA_Z = H / Math.tan(CAMERA_FOV * 0.5);
// const CAMERA_POS = [0, 0, 1];
const CAMERA_POS = [W*0.5, H*0.5, CAMERA_Z];
const CAMERA_TARGET = [W*0.5, H*0.5, 0];

const { canvas, gl } = glCanvas({
  width: W,
  height: H,
  autoScale: true,
  version: 2,
  parent: document.getElementById('app')!,
});

const quadModel = compileModel(gl, buildPlane(1, 1, 30, 30));

const main: ModelSpec = {
  ...quadModel,
  uniforms: {},
  shader: defShader(gl, {
    vs: vertexShaderFn,
    fs: fragmentShaderFn,
    attribs: {
      position: "vec2",
      uv: "vec2",
    },
    varying: {
      v_uv: "vec2",
    },
    state: {
      depth: true,
      blend: true,
    },
    uniforms: {
      tex: "sampler2D",
      model: "mat4",
      color: "vec4",
      zoomScale: "vec2",
      progress: "float",
      resolution: [V2, [SLIDE_W, SLIDE_H]],
      imageRes: "vec2",
      proj: [
        "mat4",
        // <GLMat4>ortho([], 0, W, 0, H, -4, 4),
        <GLMat4>perspective([], CAMERA_FOV, W / H, 1, 1200),
      ],
      view: [
        "mat4",
        <GLMat4>lookAt([], CAMERA_POS, CAMERA_TARGET, [0, 1, 0]), // perspect
      ],
    },
  }),
};

const CTX: AppCtx = {
  canvas,
  gl,
  width: W,
  height: H,

  mainQuad: main,
};


const ROOT = new Node3D("root");
const SLIDER_NODE = new Node3D("slider", ROOT, [0, H * 0.5, 0]);

const SLIDE_GAP = 20;
const SLIDES_NUM = 10;

const machine = setup({
  actions: {
    grow: (x) => {
      slides[x.event.slideIndex].grow();
      moveToSlide(x.event.slideIndex);
    },
    shrink: (x) => {
      slides[x.context.slideIndex].shrink();
    },
  },
}).createMachine({
  preserveActionOrder: true,
  id: "toggle",
  initial: "inactive",
  context: {
    prevSlideIndex: null,
    slideIndex: null,
    hoverSlideIndex: null,
  },
  states: {
    inactive: {
      on: {
        toggle: {
          target: "activating",
          actions: [
            { type: "grow" },
            assign({ slideIndex: ({ event }) => event.slideIndex }),
          ],
          guard: ({ event }) => event.slideIndex !== null,
        },
      },
    },
    activating: {
      on: {
        activatingDone: "active",
        toggle: {
          target: "inactivating",
          actions: [{ type: "shrink" }],
        },
      },
    },
    active: {
      on: {
        toggle: {
          target: "inactivating",
          actions: [{ type: "shrink" }],
        },
      },
    },
    inactivating: {
      on: {
        inactivatingDone: {
          target: "inactive",
          actions: [
            assign({
              slideIndex: () => null,
              prevSlideIndex: ({ context }) => context.slideIndex,
            }),
          ],
        },
      },
    },
  },
});
const actor = createActor(machine);
actor.start();

const fetchSlides = Promise.all(
  repeatedly(async (i) => {
    const image = await imageFromURL(`${i+1}.jpeg`);
    const texture = defTexture(CTX.gl, {
      image: await imageFromURL(`${i+1}.jpeg`),
      filter: TextureFilter.LINEAR,
      wrap: TextureRepeat.CLAMP,
      flip: true,
    });

    return new Slide(
      CTX,
      new Node3D(
        `${i}`,
        SLIDER_NODE,
        [i * (SLIDE_W + SLIDE_GAP), 0, 0],
        [0, 0, 0],
        [SLIDE_W, SLIDE_H, 1]
      ),
      texture,
      { w: SLIDE_W, h: SLIDE_H },
      { w: image.width, h: image.height },
      {
        onGrowComplete: () => actor.send({ type: "activatingDone" }),
        onShrinkComplete: () => actor.send({ type: "inactivatingDone" }),
      }
    );
  }, SLIDES_NUM)
);

const slides = await fetchSlides;

const SLIDER_W = (SLIDES_NUM - 1) * (SLIDE_W + SLIDE_GAP);

let scroll = {
  position: 0,
  target: W * 0.5,
  current: 0,
};

fromRAF().subscribe({
  next: () => {
    scroll.target = clamp(scroll.target, W * 0.5 - SLIDER_W, W * 0.5);
    scroll.current = mix(scroll.current, scroll.target, 0.04);

    const progress = +fit(
      scroll.current,
      W * 0.5,
      W * 0.5 - SLIDER_W,
      0,
      100
    ).toFixed(2);
    const active = Math.floor(progress / SLIDES_NUM);

    setC(SLIDER_NODE.translate, scroll.current);
    SLIDER_NODE.update();

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    clearCanvas(gl, BG_COL);

    slides.forEach((slide, i) => slide.draw(i, active));
  },
});

onlyClicks(document.body!).subscribe({
  next: (e) => {
    const node = ROOT.childForPoint([e.x, e.y, 1])?.node;

    actor.send({ type: "toggle", slideIndex: !node ? null : +node.id });
  },
});

gestureStream(canvas).subscribe({
  next: (e) => {
    if (actor.getSnapshot().value !== "inactive") {
      return;
    }

    switch (e.type) {
      case "start":
        scroll.position = scroll.current;
        break;

      case "drag":
        const dx = e.active[0].delta?.[0] || 0;
        scroll.target = scroll.position + dx * 1.5;

        break;

      default:
        break;
    }
  },
});

const moveToSlide = (index: number) => {
  scroll.target = -1 * (index * (SLIDE_W + SLIDE_GAP) - W * 0.5);
};
