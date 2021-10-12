import { Polygon } from "./Polygon";
import { PluginDrawTools } from "./DrawTools";

export class Optimize {

    private polygons: Polygon[] = [];
    private startCount: number;

    private dialog: JQuery;

    show(): void {

        const html = $("<div>").append(
            $("<div>", { id: "polystats" }),
            $("<div>", { id: "polyslide" }).append(
                $("<input>", { type: "range", min: "0", max: "1000", value: "0", id: "tolerance", width: "100%" })
                    .on("input", () => this.optimize())
            ));

        this.dialog = dialog({
            title: "Optimize",
            html,
            buttons: {
                "OK": () => this.close()
            },
            closeCallback: () => {
                const drawTools = window.plugin.drawTools as PluginDrawTools;
                drawTools.drawnItems.clearLayers();
                drawTools.load();
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
                this.polygons.push(new Polygon(layer as L.Polygon, true));
            } else if (layer instanceof L.GeodesicPolyline || layer instanceof L.Polyline) {
                this.polygons.push(new Polygon(layer as L.Polygon, false));
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
            p.optimize(tolerance * 1e-6);
            p.update();
        })

        this.updateStats();
    }

}