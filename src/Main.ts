import * as Plugin from "iitcpluginkit";
import * as togeojson from "@tmcw/togeojson";

const enum FILEType {
    KML,
    GPX,
    TCX,
    GeoJSON,
    DrawTools,
    unknown
}

class KMLImport implements Plugin.Class {

    private DTmanualOpt: () => void;

    init() {
        console.log("KMLImport " + VERSION);

        require("./styles.css");

        this.monkeyPatchDrawTools();
    }

    monkeyPatchDrawTools(): void {
        if (typeof window.plugin.drawTools !== "function") {
            alert("KMLImport requires DrawTools");
            return;
        }

        this.DTmanualOpt = window.plugin.drawTools.manualOpt as () => void;
        window.plugin.drawTools.manualOpt = () => this.manualOpt();
    }


    manualOpt() {
        this.DTmanualOpt();

        $(".drawtoolsSetbox a:eq(3)").after(
            $("<a>", {
                click: () => this.import(),
                tabindex: "0",
                text: "Import KML/GPX/Geojson"
            })
        );
    }

    async import(): Promise<void> {
        const files = await this.fileChooser();
        const text = await this.readFile(files[0]);

        const content = (new window.DOMParser()).parseFromString(text, "text/xml");

        let converted: any;
        switch (this.getFileType(text)) {
            case FILEType.GPX: converted = togeojson.gpx(content); break;
            case FILEType.KML: converted = togeojson.kml(content); break;
            case FILEType.GeoJSON: converted = JSON.parse(text); break;
            case FILEType.DrawTools:
                this.importDrawTools(text);
                return;
            default:
                alert("unrecognized file type");
                return;
        }

        this.importGeoJSON(converted);
    }


    importGeoJSON(geo: any): void {
        console.log("convert", geo);

        const DTLayer = window.plugin.drawTools.drawnItems as L.FeatureGroup<any>;

        if (!window.plugin.drawTools.merge.status) {
            DTLayer.clearLayers();
        }

        if (geo.features) {
            geo.features.forEach(feature => {
                const layer = this.createPoly(feature);
                if (layer) {
                    DTLayer.addLayer(layer);
                }
            })
        } else {
            const layer = this.createPoly(geo.features);
            if (layer) {
                DTLayer.addLayer(layer);
            }
        }
    }

    createPoly(feature: any): L.ILayer | undefined {
        if (feature.type !== "Feature") {
            console.log("skipping data-block", feature.type);
            return;
        }

        if (!feature.geometry) {
            console.log("block has no data", feature);
            return;
        }

        if (feature.geometry.type === "LineString") {
            const latLngs = feature.geometry.coordinates.map(point => {
                return L.latLng(point[1], point[0]);
            })

            if (latLngs.length === 0) {
                console.log("LineString without coordinates", feature);
                return;
            }

            return L.geodesicPolyline(latLngs, window.plugin.drawTools.lineOptions);
        }


        if (feature.geometry.type === "Polygon") {

            const latLngs = feature.geometry.coordinates[0].map(point => {
                return L.latLng(point[1], point[0]);
            })

            return L.geodesicPolygon(latLngs, window.plugin.drawTools.polygonOptions);
        }

        if (feature.geometry.type === "MultiPolygon") {
            // TODO: multipolygon
            const latLngs = feature.geometry.coordinates[0][0].map(point => {
                return L.latLng(point[1], point[0]);
            })

            return L.geodesicPolygon(latLngs, window.plugin.drawTools.polygonOptions);
        }
    }

    importDrawTools(text: string): void {
        const data = JSON.parse(text);
        window.plugin.drawTools.import(data);
    }

    getFileType(content: string): FILEType {
        if (content.includes("<gpx ")) return FILEType.GPX;
        if (content.includes("<kml ")) return FILEType.KML;
        if (content.includes('"type":"FeatureCollection"')) return FILEType.GeoJSON;

        return FILEType.unknown;
    }


    async fileChooser(): Promise<FileList> {
        return new Promise((resolve, reject) => {
            const fileInput = L.DomUtil.create("input", "hidden") as HTMLInputElement;
            fileInput.type = "file";
            fileInput.accept = ".gpx,.kml,.json,.geojson";
            fileInput.style.display = "none";
            fileInput.addEventListener("change", () => {
                if (fileInput.files !== null) {
                    resolve(fileInput.files)
                } else {
                    reject();
                }
            }, false);

            fileInput.click();
        })
    }

    async readFile(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.addEventListener("load", () => {
                if (fr.result !== null) {
                    resolve(fr.result as string)
                } else {
                    reject();
                }
            });
            fr.addEventListener("error", reject);
            fr.readAsText(file);
        });
    }


}


Plugin.Register(new KMLImport(), "KMLImport");
