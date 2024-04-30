import { DrawMode } from "@thi.ng/webgl";

export const buildPlane = (
    width = 1,
    height = 1,
    widthSegments = 1,
    heightSegments = 1
  ) => {
    const widthHalf = width * 0.5;
    const heightHalf = height * 0.5;
  
    const gridX = Math.floor(widthSegments);
    const gridY = Math.floor(heightSegments);
  
    const gridX1 = gridX + 1;
    const gridY1 = gridY + 1;
  
    const segmentWidth = width / gridX;
    const segmentHeight = height / gridY;
  
    const indices = [];
    const vertices = [];
    const normals = [];
    const uvs = [];
  
    for (let iy = 0; iy < gridY1; iy++) {
      const y = iy * segmentHeight - heightHalf;
  
      for (let ix = 0; ix < gridX1; ix++) {
        const x = ix * segmentWidth - widthHalf;
  
        vertices.push(x, -y, 0);
  
        normals.push(0, 0, 1);
  
        uvs.push(ix / gridX);
        uvs.push(1 - iy / gridY);
      }
    }
  
    for (let iy = 0; iy < gridY; iy++) {
      for (let ix = 0; ix < gridX; ix++) {
        const a = ix + gridX1 * iy;
        const b = ix + gridX1 * (iy + 1);
        const c = ix + 1 + gridX1 * (iy + 1);
        const d = ix + 1 + gridX1 * iy;
  
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    return {
      attribs: {
        position: { size: 3, data: new Float32Array(vertices) },
        normal: { size: 3, data: new Float32Array(normals) },
        uv: { size: 2, data: new Float32Array(uvs) },
      },
      indices: {
        data:
          indices.length > 65536
            ? new Uint32Array(indices)
            : new Uint16Array(indices),
      },
      uniforms: {},
      shader: <any>null,
      mode: DrawMode.TRIANGLES,
      num: indices.length,
    };
  };