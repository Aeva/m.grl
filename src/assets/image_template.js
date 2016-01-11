// - bundled image assets --------------------------------------------------- //


(function () {
    var lookup_table = #### JSON HERE ####;
    please.prop_map(lookup_table, function (name, src) {
        // see m.media.js's please.media.handlers.img for reference:
        var img = new Image();
        img.loaded = false;
        img.addEventListener("load", function() {img.loaded = true});
        img.src = src;
        img.asset_name = name;
#ifdef WEBGL
        img.instance = please.media.__image_instance;
#endif
        please.media.assets[name] = img;
        please.media.assets[name].bundled = true;
    });
})();
