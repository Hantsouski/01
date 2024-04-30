import { GLMat4, ModelSpec, Texture, draw } from "@thi.ng/webgl";
import { AppCtx } from "./api";
import { Node3D } from "@thi.ng/scenegraph";
import { setC } from "@thi.ng/vectors";
import { clamp } from "@thi.ng/math";
import gsap from "gsap";

export class Slide  {
  private drawSpec: ModelSpec;
  private growState: { scale: number; resX: number; resY: number };

  constructor(
    private appCtx: AppCtx,
    public node: Node3D,
    img: Texture,
    private slideRes: { w: number, h: number },
    private imageRes: { w: number; h: number },
    private growStateCallbacks: {
      onGrowComplete: () => void,
      onShrinkComplete: () => void,
    }
  ) {
    this.node.containsLocalPoint = ([x, y]) =>
      x >= -0.5 && x <= 0.5 && y >= -0.5 && y <= 0.5;

    this.drawSpec = {
      ...this.appCtx.mainQuad,
      textures: [img],
      uniforms: {
        progress: 0,
        zoomScale: [appCtx.width / this.slideRes.w, appCtx.height / this.slideRes.h],
        color: [0.2, 0.3, 0.5, 1],
        imageRes: [this.imageRes.w, this.imageRes.h],
        model: <GLMat4>this.node.mat,
      },
    };

    this.growState = {
      scale: 0,
      resX: this.slideRes.w,
      resY: this.slideRes.h,
    };
  }

  public grow() {
    setC(
      this.node.translate,
      this.node.translate[0],
      this.node.translate[1],
      5
    );

    gsap.to(this.growState, {
      scale: 1,
      resX: this.appCtx.width,
      resY: this.appCtx.height,
      duration: 1.5,
      ease: "sine.out",
      onUpdate: () => {
        this.drawSpec.uniforms!.progress = this.growState.scale;
        this.drawSpec.uniforms!.resolution = [
          this.growState.resX,
          this.growState.resY,
        ];
      },
      onComplete: () => {
        this.growStateCallbacks.onGrowComplete();
      },
    });
  }

  public shrink() {
    gsap.to(this.growState, {
      scale: 0,
      resX: this.slideRes.w,
      resY: this.slideRes.h,
      duration: 1.5,
      ease: "sine.in",
      onUpdate: () => {
        this.drawSpec.uniforms!.progress = this.growState.scale;
        this.drawSpec.uniforms!.resolution = [
          this.growState.resX,
          this.growState.resY,
        ];
      },
      onComplete: () => {
        setC(
          this.node.translate,
          this.node.translate[0],
          this.node.translate[1],
          0
        );
        this.growStateCallbacks.onShrinkComplete();
      },
    });
  }

  // shouldn't be here
  public slidesNum = 10;

  public draw(index: number, active: number) {
    const translate = {
      y: this.node.translate[1],
    };
    const toY =
      clamp(0, this.slidesNum - Math.abs(index - active), 1) * 20 -
      this.slideRes.h * 0.5;

    if (this.growState.scale === 0) {
      gsap.to(translate, {
        y: toY,
        ease: "sine",
        onUpdate: () => {
          if (this.growState.scale !== 0) {
            return;
          }
  
          setC(this.node.translate, this.node.translate[0], translate.y);
        },
      });
    } else {
      gsap.killTweensOf(translate);
      setC(this.node.translate, this.node.translate[0], 0)
    }
  
    this.drawSpec.uniforms!.model = <GLMat4>this.node.mat;

    draw(this.drawSpec);
  }
}
