declare module 'd3-delaunay' {
  export class Delaunay<P extends ArrayLike<number> = [number, number]> {
    constructor(points: Iterable<P>);
    static from<P extends ArrayLike<number> = [number, number]>(
      points: Iterable<P>
    ): Delaunay<P>;
    voronoi(bounds?: {
      xmin?: number;
      ymin?: number;
      xmax?: number;
      ymax?: number;
    }): Voronoi<P>;
    neighbors(i: number): IterableIterator<number>;
  }

  export class Voronoi<P extends ArrayLike<number> = [number, number]> {
    cellPolygons(): IterableIterator<[number, P[]]>;
    renderBounds(): string;
  }
}
