import { mapToRange } from '@app/lib';
import { Line3, Vector3 } from 'three';
import {
  TetEdge,
  EdgeRoute,
  Pixel,
  TetrahedronConfig,
  TetrahedronConfigOptions,
  TetVertex,
  VertexId as V,
} from './tetrahedron.types';

export class TetrahedronUtils {
  static readonly sqrt2 = Math.sqrt(2);
  static readonly sqrt6 = Math.sqrt(6);
  static readonly tetrahedralAngle = Math.acos(-1 / 3);

  static configFromOptions(
    configOptions: TetrahedronConfigOptions
  ): TetrahedronConfig {
    const { paddedEdgeLength, edgePadding, pixelsPerEdge } = configOptions;
    const edgeLength = paddedEdgeLength - 2 * edgePadding;
    const pixelsTotal = 6 * pixelsPerEdge;
    const pixelSpacing = edgeLength / pixelsPerEdge;
    const circumRadius = (paddedEdgeLength / 4) * TetrahedronUtils.sqrt6;
    const midRadius = (paddedEdgeLength / 4) * TetrahedronUtils.sqrt2;

    return {
      ...configOptions,
      edgeLength,
      pixelsPerEdge,
      pixelsTotal,
      pixelSpacing,
      circumRadius,
      midRadius,
    };
  }

  static verticesFromCircumRadius(circumRadius: number): TetVertex[] {
    const A = new Vector3(0, circumRadius, 0);
    const B = A.clone().applyAxisAngle(
      new Vector3(1, 0, 0),
      TetrahedronUtils.tetrahedralAngle
    );
    const C = B.clone().applyAxisAngle(new Vector3(0, 1, 0), (2 * Math.PI) / 3);
    const D = C.clone().applyAxisAngle(new Vector3(0, 1, 0), (2 * Math.PI) / 3);

    return [A, B, C, D].map(position => ({ position }));
  }

  static edgeFromVertices(v0: TetVertex, v1: TetVertex, index: number): TetEdge {
    return {
      v0,
      v1,
      index,
      midpoint: new Line3(v0.position, v1.position).getCenter(
        new Vector3(0, 0, 0)
      ),
    };
  }

  static pixelsFromEdge(edge: TetEdge, config: TetrahedronConfig): Pixel[] {
    const mapCoordValue = mapToRange(
      -config.circumRadius,
      config.circumRadius,
      -1,
      1
    );
    const mapOriginDistance = mapToRange(0, config.circumRadius, 0, 1);
    const mapMidpointDistance = mapToRange(0, config.edgeLength / 2, 0, 1);

    return TetrahedronUtils.interpolateBetweenPoints(
      edge.v0.position,
      edge.v1.position,
      config.pixelsPerEdge,
      config.pixelSpacing,
      config.edgePadding
    ).map((position, i) => ({
      edge,
      position,
      index: config.pixelsPerEdge * edge.index + i,
      x: mapCoordValue(position.x),
      y: mapCoordValue(position.y),
      z: mapCoordValue(position.z),
      dOrigin: mapOriginDistance(position.length()),
      dMidpoint: mapMidpointDistance(
        Math.abs(position.distanceTo(edge.midpoint))
      ),
    }));
  }

  static interpolateBetweenPoints(
    a: Vector3,
    b: Vector3,
    n: number,
    spacing: number,
    padding = 0
  ): Vector3[] {
    const dir = b.clone().sub(a).normalize();
    const p0 = a.clone().add(dir.clone().setLength(padding));

    return [...Array(n).keys()].map((_, i) =>
      p0.clone().add(dir.clone().setLength(i * spacing))
    );
  }

  static validateEdgeRoute(route: EdgeRoute) {
    const { A, B, C, D } = V;
    const allSegments = [
      [A, B],
      [A, C],
      [A, D],
      [B, C],
      [B, D],
      [C, D],
    ].map(verts => verts.join(''));
    const providedSegments = route.map(verts => [...verts].sort().join(''));

    if ([...new Set(providedSegments)].length !== allSegments.length) {
      throw new Error(`TetEdge route contains a duplicate segment!`);
    }

    if (!providedSegments.every(seg => allSegments.includes(seg))) {
      throw new Error(`TetEdge route contains an invalid segment!`);
    }

    return true;
  }
}
