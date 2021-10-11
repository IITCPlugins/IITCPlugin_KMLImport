declare module "@tmcw/togeojson" {

    export function gpx(content: Document): GeoJSON.FeatureCollection;
    export function kml(content: Document): GeoJSON.FeatureCollection;
    export function tcx(content: Document): GeoJSON.FeatureCollection;
}
