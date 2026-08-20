declare module 'd3-delaunay' {
  export class Delaunay<P extends ArrayLike<number> = [number, number]> {
    constructor(points: Iterable<P>);
    static from<P extends ArrayLike<number> = [number, number]>(
      points: Iterable<P>
    ): Delaunay<P>;
    // d3-delaunay v6 voronoi() expects an iterable bounds array [xmin, ymin, xmax, ymax].
    voronoi(bounds?: [number, number, number, number]): Voronoi<P>;
    neighbors(i: number): IterableIterator<number>;
  }

  export class Voronoi<P extends ArrayLike<number> = [number, number]> {
    // d3-delaunay v6 cellPolygons() yields the polygon itself (array of [x,y]
    // pairs) with an `index` property set to the cell index — NOT a tuple.
    cellPolygons(): IterableIterator<(P[] & { index: number })>;
    renderBounds(): string;
  }
}
