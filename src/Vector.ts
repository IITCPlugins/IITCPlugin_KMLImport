export class Vector {
    public x: number;
    public y: number;
    public z: number;

    static fromCartesian(p: L.LatLng): Vector {
        const d2r = Math.PI / 180;

        const lat = p.lat * d2r;
        const lng = p.lng * d2r;
        const o = Math.cos(lat);
        return new Vector(o * Math.cos(lng), o * Math.sin(lng), Math.sin(lat));
    }


    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    cross(n: Vector): Vector {
        return new Vector(
            this.y * n.z - this.z * n.y,
            this.z * n.x - this.x * n.z,
            this.x * n.y - this.y * n.x);
    }

    dot(n: Vector): number {
        return this.x * n.x + this.y * n.y + this.z * n.z;
    }

    sub(p2: Vector): Vector {
        return new Vector(this.x - p2.x, this.y - p2.y, this.z - p2.z);
    }

    length(): number {
        return Math.sqrt(this.x * this.x * +this.y * this.y + this.z * this.z);
    }
}
