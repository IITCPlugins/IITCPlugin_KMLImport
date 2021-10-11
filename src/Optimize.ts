/* eslint-disable max-classes-per-file */
import { Vector } from "./Vector";

class Polygon {
    private polygon: L.Polygon;
    private points: Point[];
    private optimized: Point[];

    constructor(base: L.Polygon) {
        this.polygon = base;
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
        return this.douglasStep(points, tolerance);

    }

    private douglasStep(points: Point[], tolerance: number): Point[] {
        if (points.length < 3) {
            return points;
        }

        const [split, distance] = this.findFarrestPoint(points);

        if (distance > tolerance) {
            const left = this.douglasStep(points.slice(0, split + 1), tolerance);
            const right = this.douglasStep(points.slice(split), tolerance);
            return [...left.slice(0, -1), ...right];
        } else {
            return [points[0], points[1]];
        }
    }


    private findFarrestPoint(points: Point[]): [index: number, distance: number] {
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


    update(): void {
        const lls = this.optimized.map(p => p.coordinate);
        this.polygon.setLatLngs(lls);
    }
}

class Point {

    public coordinate: L.LatLng;
    public xyz: Vector;


    constructor(p: L.LatLng) {
        this.coordinate = p;
        this.xyz = Vector.fromCartesian(p);
    }
}


export class Optimize {

    private polygons: Polygon[] = [];
    private startCount: number;

    private dialog: JQuery;

    show(): void {

        const html = $("<div>").append(
            $("<div>", { id: "polystats" }),
            $("<div>", { id: "polyslide" }).append(
                $("<input>", { type: "range", min: "0", max: "100", value: "0", id: "tolerance" })
                    .on("input", () => this.optimize())
            ));

        this.dialog = dialog({
            title: "Optimize",
            html,
            buttons: {
                "OK": () => this.close()
            },
            closeCallback: () => {
                window.plugin.drawTools.drawnItems.clearLayers();
                window.plugin.drawTools.load();
            }
        })

        this.readPolygons();
    }


    close(): void {
        window.plugin.drawTools.save();
        this.dialog.dialog("close");
    }


    readPolygons(): void {
        this.polygons = [];

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        window.plugin.drawTools.drawnItems.eachLayer((layer: L.ILayer) => {
            if (layer instanceof L.GeodesicPolygon || layer instanceof L.Polygon) {
                this.polygons.push(new Polygon(layer as L.Polygon));
            } else if (layer instanceof L.GeodesicPolyline || layer instanceof L.Polyline) {
                this.polygons.push(new Polygon(layer as L.Polygon));
            }
        });

        this.startCount = this.polygons.reduce((sum, poly) => sum + poly.getPointCount(), 0);
        this.updateStats();
    }


    updateStats(): void {
        const pointCount = this.polygons.reduce((sum, poly) => sum + poly.getPointCount(), 0);
        const status = `Polygons: ${this.polygons.length}<br>Total Points: ${pointCount} (was ${this.startCount})`
        $("#polystats", this.dialog).html(status);
    }

    optimize(): void {
        const tolerance = parseInt($("#tolerance", this.dialog).val() as string);

        this.polygons.forEach(p => {
            p.optimize(tolerance * 1e-5);
            p.update();
        })

        this.updateStats();
    }

}