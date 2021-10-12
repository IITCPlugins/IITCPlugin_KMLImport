import { Point } from "./Point";

export class Polygon {
    private polygon: L.Polygon;
    private points: Point[];
    private optimized: Point[];
    private isClosed: boolean;

    constructor(base: L.Polygon, isClosed: boolean) {
        this.polygon = base;
        this.isClosed = isClosed;

        const lls = this.polygon.getLatLngs();
        this.points = lls.map(p => new Point(p));

        this.optimized = this.points;
    }

    getPointCount(): number {
        return this.optimized.length;
    }

    optimize(tolerance: number): void {
        const points = this.filterDuplicates(this.points);

        this.optimized = this.douglasPeucker(points, tolerance);
    }

    private filterDuplicates(points: Point[]): Point[] {
        return points.filter((p, index) => index === 0 || !p.coordinate.equals(points[index - 1].coordinate));
    }


    private douglasPeucker(points: Point[], tolerance: number): Point[] {
        if (this.isClosed) {
            const split = this.findFarrestPoint(points);
            const left = this.douglasStep(points.slice(0, split + 1), tolerance);
            const right = this.douglasStep(points.slice(split), tolerance);
            return [...left.slice(0, -1), ...right];
        } else {
            return this.douglasStep(points, tolerance);
        }
    }

    private douglasStep(points: Point[], tolerance: number): Point[] {
        if (points.length < 3) {
            return points;
        }

        const [split, distance] = this.findFarrestPointFromLine(points);

        if (distance > tolerance) {
            const left = this.douglasStep(points.slice(0, split + 1), tolerance);
            const right = this.douglasStep(points.slice(split), tolerance);
            return [...left.slice(0, -1), ...right];
        } else {
            return [points[0], points[1]];
        }
    }


    private findFarrestPointFromLine(points: Point[]): [index: number, distance: number] {
        const first = points[0];
        const last = points[points.length - 1];

        const basePlane = first.xyz.cross(last.xyz);
        const planeLength = basePlane.length();
        if (length === 0) return [0, 0];

        let maxDistance = 0;
        let maxIndex = 0;
        for (let i = 1; i < points.length; i++) {
            const distance = Math.abs(points[i].xyz.sub(first.xyz).dot(basePlane));
            if (distance > maxDistance) {
                maxDistance = distance;
                maxIndex = i;
            }
        }

        maxDistance /= planeLength;
        return [maxIndex, maxDistance];
    }


    private findFarrestPoint(points: Point[]): number {
        const first = points[0];

        let maxDistance = 0;
        let maxIndex = 0;
        for (let i = 1; i < points.length; i++) {
            const distance = points[i].xyz.sub(first.xyz).length();
            if (distance > maxDistance) {
                maxDistance = distance;
                maxIndex = i;
            }
        }

        return maxIndex;
    }


    update(): void {
        const lls = this.optimized.map(p => p.coordinate);
        this.polygon.setLatLngs(lls);
    }
}
