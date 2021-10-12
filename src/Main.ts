import * as Plugin from "iitcpluginkit";
import * as togeojson from "@tmcw/togeojson";
import * as GeoJSON from "geojson";
import { Optimize } from "./Optimize";
import { DTEntiy, PluginDrawTools } from "./DrawTools";



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

        const DTitems = this.convert2DrawTools(text);
        if (!DTitems) return;
        this.importIntoDrawTools(DTitems);
    }

    convert2DrawTools(text: string): DTEntiy[] | undefined {

        try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const json = JSON.parse(text);

            // DrawTools
            if (json[0] && json[0].type && ["polygon", "circle", "polyline", "marker"].includes(json[0].type)) {
                return json as DTEntiy[];
            }

            // GeoJSON
            if (json.type && json.type === "FeatureCollection") {
                return this.convertGeoJSON(json);
            }
        } catch { /* ignore */ }


        if (text.search(/^\s*<?xml</)) {
            try {
                const content = (new window.DOMParser()).parseFromString(text, "text/xml");

                // KML
                if (content.getElementsByTagName("kml")) {
                    const converted = togeojson.kml(content);
                    return this.convertGeoJSON(converted);
                }

                // GPX
                if (content.getElementsByTagName("gpx")) {
                    const converted = togeojson.gpx(content);
                    return this.convertGeoJSON(converted);
                }

                // TCX
                if (content.getElementsByTagName("TrainingCenterDatabase")) {
                    const converted = togeojson.tcx(content);
                    return this.convertGeoJSON(converted);
                }
            } catch { /* ignore */ }
        }



        alert("unrecognized file type");
        return;
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

        let latLng: L.LatLng;
        let latLngs: L.LatLng[];
        switch (feature.geometry.type) {
            case "Point":
                latLng = L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
                items.push({ type: "marker", latLng });
                break;

            case "MultiPoint":
                feature.geometry.coordinates.forEach(point => {
                    latLng = L.latLng(point[1], point[0]);
                    items.push({ type: "marker", latLng });
                })
                break;

            case "LineString":
                latLngs = feature.geometry.coordinates.map(point => {
                    return L.latLng(point[1], point[0]);
                })

                if (latLngs.length === 0) {
                    console.error("LineString without coordinates", feature);
                    return;
                }

                items.push({ type: "polyline", latLngs });
                break;

            case "MultiLineString":
                feature.geometry.coordinates.forEach(line => {
                    latLngs = line.map(point => {
                        return L.latLng(point[1], point[0]);
                    })

                    if (latLngs.length > 1) {
                        items.push({ type: "polyline", latLngs });
                    }

                })
                break;

            case "Polygon":
                feature.geometry.coordinates.forEach(poly => {
                    latLngs = poly.map(point => {
                        return L.latLng(point[1], point[0]);
                    })

                    if (latLngs.length > 1) {
                        items.push({ type: "polygon", latLngs });
                    }
                })
                break;

            case "MultiPolygon":
                feature.geometry.coordinates.forEach(multipoly => {
                    multipoly.forEach(poly => {
                        latLngs = poly.map(point => {
                            return L.latLng(point[1], point[0]);
                        })

                        if (latLngs.length > 1) {
                            items.push({ type: "polygon", latLngs });
                        }
                    })
                })
                break;

            default:
                console.error("unrecognized geometry type")
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
