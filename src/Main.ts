import * as Plugin from "iitcpluginkit";
import * as togeojson from "@tmcw/togeojson";
import * as GeoJSON from "geojson";
import { Optimize } from "./Optimize";
import { DTEntiy, PluginDrawTools } from "./DrawTools";


const enum FILEType {
    KML,
    GPX,
    TCX,
    FTGeoJSON,
    DrawTools,
    unknown
}


class KMLImport implements Plugin.Class {

    private DTmanualOpt: () => void;

    init() {
        console.log("KMLImport " + VERSION);

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

        const newButton = $("<a>", {
            click: (event: MouseEvent) => {
                void this.import();
                $(event.target!).blur();
            },

            tabindex: "0",
            text: "Import",
            title: "Import DrawTools/KML/GPX/Geojson/"
        })

        const importButton = $(".drawtoolsSetbox a:contains(Import Drawn Items)");
        if (importButton.length === 1) {
            importButton.replaceWith(newButton)
        } else {
            $(".drawtoolsSetbox a:eq(3)").after(newButton);
        }

        $(".drawtoolsSetbox a:last").before(
            $("<a>", {
                click: () => this.optimize(),
                tabindex: "0",
                text: "Optimize"
            })
        );
    }

    async import(): Promise<void> {
        const files = await this.fileChooser();
        const text = await this.readFile(files[0]);

        let content;
        let converted;
        let DTitems;
        switch (this.getFileType(text)) {
            case FILEType.GPX:
                content = (new window.DOMParser()).parseFromString(text, "text/xml");
                converted = togeojson.gpx(content);
                DTitems = this.convertGeoJSON(converted);
                this.importIntoDrawTools(DTitems);
                break;
            case FILEType.KML:
                content = (new window.DOMParser()).parseFromString(text, "text/xml");
                converted = togeojson.kml(content);
                DTitems = this.convertGeoJSON(converted);
                this.importIntoDrawTools(DTitems);
                break;
            case FILEType.TCX:
                content = (new window.DOMParser()).parseFromString(text, "text/xml");
                converted = togeojson.tcx(content);
                DTitems = this.convertGeoJSON(converted);
                this.importIntoDrawTools(DTitems);
                break;
            case FILEType.FTGeoJSON:
                converted = JSON.parse(text) as GeoJSON.FeatureCollection;
                DTitems = this.convertGeoJSON(converted);
                this.importIntoDrawTools(DTitems);
                break;
            case FILEType.DrawTools:
                const data = JSON.parse(text) as DTEntiy[];
                this.importIntoDrawTools(data);
                break;
            default:
                alert("unrecognized file type");
        }
    }


    convertGeoJSON(geo: GeoJSON.FeatureCollection): DTEntiy[] {

        const DTitems: DTEntiy[] = [];

        if (geo.features) {
            geo.features.forEach(feature => this.createPoly(feature, DTitems));
        } else {
            this.createPoly(geo.features, DTitems);
        }

        const DTLayer = window.plugin.drawTools.drawnItems as L.FeatureGroup<any>;
        if (!window.plugin.drawTools.merge.status) {
            DTLayer.clearLayers();
        }

        return DTitems;
    }

    createPoly(feature: GeoJSON.Feature, items: DTEntiy[]): void {
        if (feature.type !== "Feature") {
            console.log("skipping data-block", feature.type);
            return;
        }

        if (!feature.geometry) {
            console.log("block has no data", feature);
            return;
        }

        if (feature.geometry.type === "LineString") {
            const latLngs: L.LatLng[] = feature.geometry.coordinates.map(point => {
                return L.latLng(point[1], point[0]);
            })

            if (latLngs.length === 0) {
                console.log("LineString without coordinates", feature);
                return;
            }

            items.push({ type: "polyline", latLngs });
        }


        if (feature.geometry.type === "Polygon") {

            const latLngs: L.LatLng[] = feature.geometry.coordinates[0].map(point => {
                return L.latLng(point[1], point[0]);
            })

            items.push({ type: "polygon", latLngs });
        }

        if (feature.geometry.type === "MultiPolygon") {
            // TODO: multipolygon
            const latLngs: L.LatLng[] = feature.geometry.coordinates[0][0].map(point => {
                return L.latLng(point[1], point[0]);
            })

            items.push({ type: "polygon", latLngs });
        }
    }

    importIntoDrawTools(data: DTEntiy[]): void {
        const drawTools = window.plugin.drawTools as PluginDrawTools;
        if (!drawTools.merge || !drawTools.merge.status) {
            drawTools.drawnItems.clearLayers();
        }
        try {
            drawTools.import(data);
        } catch {
            drawTools.optAlert('<span style="color: #f88">Import failed</span>');
        }
        drawTools.save();
    }

    getFileType(content: string): FILEType {
        if (content.includes("<gpx")) return FILEType.GPX;
        if (content.includes("<kml")) return FILEType.KML;
        if (content.includes("<TrainingCenterDatabase")) return FILEType.TCX;
        if (content.includes('"type":"FeatureCollection"')) return FILEType.FTGeoJSON;
        if (content.includes('"type":"polygon"') || content.includes('"type":"circle"')
            || content.includes('"type":"polyline"') || content.includes('"type":"marker"')) return FILEType.DrawTools;

        return FILEType.unknown;
    }


    async fileChooser(): Promise<FileList> {
        return new Promise((resolve, reject) => {
            const fileInput = L.DomUtil.create("input", "hidden") as HTMLInputElement;
            fileInput.type = "file";
            fileInput.accept = ".gpx,.tcx,.kml,.json,.geojson";
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

    optimize = (): void => {
        new Optimize().show();
    }

}


Plugin.Register(new KMLImport(), "KMLImport");
