import { Vector } from "./Vector";

export class Point {

    public coordinate: L.LatLng;
    public xyz: Vector;


    constructor(p: L.LatLng) {
        this.coordinate = p;
        this.xyz = Vector.fromCartesian(p);
    }
}
