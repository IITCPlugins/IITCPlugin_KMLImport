# IITCPlugin_KMLImport

This is an IITC (Ingress Intel Total Conversation) Plugin.

Requires Drawtools.
- Replaces "Import" in the `DrawTools Opt` menu  
Now you can load KML,GPX,TCX,Geojson or DrawTool files
- Adds a "Optimize" for reducing the point count  
Usually imported data has far more detailed as you need. This will help you to reduce the detail level.
Also keep in mind that DrawTool Data is limited to 5MB.

![Example](/example.png?raw=true)

# Install
(requires IITC)  
![iitc_plugin_KMLImport.user.js
](/dist/iitc_plugin_KMLImport.user.js?raw=true)


# Build
- `yarn install`
- `yarn build`
(or `yarn build:prod` for release version)
