
export type DTEntiy = DTEntityPolyline | DTEntityPolygon | DTEntityCircle | DTEntityMarker;

interface DTEntityPolyline {
    type: "polyline";
    latLngs: L.LatLng[];
    color?: string;
}

interface DTEntityPolygon {
    type: "polygon";
    latLngs: L.LatLng[];
    color?: string;
}

interface DTEntityCircle {
    type: "circle";
    latLng: L.LatLng;
    radius: number;
    color?: string;
}

interface DTEntityMarker {
    type: "marker";
    latLng: L.LatLng;
    color?: string;
}

export interface PluginDrawTools {
    drawnItems: L.FeatureGroup<any>;
    import: (DTitems: DTEntiy[]) => void;
    load: () => void;
    save: () => void;
    manualOpt: () => void;
    optAlert: (text: string) => void;

    merge?: { status: boolean }; // iitc-ce
}
