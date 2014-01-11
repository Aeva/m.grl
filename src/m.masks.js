// - m.masks.js ------------------------------------------------------------- //


please.masks = {
    "__data" : {},

    // this is the grid size assumed of tiles
    "grid_period" : 32,

    // if your physics data is on a 8x8 grid, and your tile data is on
    // a 32x32 grid, the sample_resolution will be 4.  If your physics
    // data is on a 16x16 grid and your tile data is on a 32x32 grid,
    // then your sample_resolution will be 2.  Note that the mask file
    // must have the same dimensions as the sprite sheet it
    // corresponds to!
    "sample_resolution" : 4,

    // The following are search paths, where your resources are
    // assumed to be located.  These are both relative to
    // please.media.search_paths.img, and will be path normalized
    // elsewhere.
    "tile_path" : "map_tiles/",
    "mask_path" : "tile_masks/",

    // This defines the order of preference of colors in your tile
    // set.  With the defaults below, when the mask is resized for
    // physics, black will have priority over white in tie breakers.
    "pallet_order" : [
        [0,   0,   0],
        [255, 255, 255],
    ],

    // Default color for the mask if no mask file exists for a given image
    "default_color" : [255, 255, 255],

    // Don't use the following functions directly.
    "__find" : function (file_name) {},
    "__fudge_tiles" : function (file_name) {},
    "__fudge_mask" : function (file_name) {},
    "__generate" : function (file_name) {},
};




please.load_masked = function (file_name) {
    /*
      This function wraps please.load, and is specifically for loading
      named files that have a corresponding mask file.

      The argument is not a URL, as please.masks.tile_path and
      please.masks.mask_path will be prepended to the file_name.  You
      do not need to worry about adding a trailing slash, that will be
      done automatically.
     */

    var paths = please.masks.__find(file_name);
    var mask_status = 0; // -1 == error, 1 == loaded
    var tile_status = 0; // -1 == error, 1 == loaded

    var common_callback = function () {
        if (mask_status !== 0 && tile_status !== 0) {
            var common = mask_status + tile_status;
            if (common == 2) {
                // both passed
                please.masks.__generate(file_name);
            }
            else if (common == -2) {
                // both failed
                console.error("Failed to load tile or mask for " + file_name);
            }
            else if (mask_status == -1) {
                // mask failed
                console.warn("Fudging mask for " + file_name);
                please.masks.__fudge_mask(file_name);
            }
            else if (tile_status == -1) {
                // tile failed
                console.warn("Fudging tile sheet for " + file_name);
                please.masks.__fudge_tiles(file_name);
            }
        }
    };

    var callbacks = {
        "tile" : function (status, url) {
            if (status == "failed") {
                tile_status = -1;
            }
            else {
                tile_status = 1;
            }
            common_callback();
        },
        "mask" : function (status, url) {
            if (status == "failed") {
                mask_status = -1;
            }
            else {
                mask_status = 1;
            }
            common_callback();
        },
    };

    ITER_PROPS(prop, paths) {
        var uri = paths[prop];
        var callback = callbacks[prop];
        please.load("img", uri, callback);
    };
};




please.masks.__find = function (file_name) {
    /* 
       This function returns two uris, one for the tile sheet and one
       for the mask image, based on your search paths.  Automatically
       adds a trailing slash if none exists on the search paths.
    */    
    var normalize = function (path) {
        // I am so, so sorry
        return path.endsWith("/") ? path : path + "/";
    };
    var base = normalize(please.media.search_paths.img);
    return {
        "tile" : base + normalize(please.masks.tile_path) + file_name,
        "mask" : base + normalize(please.masks.mask_path) + file_name,
    };
};




please.masks.__fudge_tiles = function (file_name) {
    console.warn("Not implemented: please.masks.__fudge_tiles");
    var paths = please.masks.__find(file_name);
};




please.masks.__fudge_mask = function (file_name) {
    /*
      Is called as a result of please.load_masked(...) when the mask
      itself is missing.  This creates a blank mask file, tucks the
      image where the mask should have been, and then calls
      please.mask.__generate.
     */
    
    var paths = please.masks.__find(file_name);
    var tiles = please.access(paths.tile);
    var width = tiles.width, height = tiles.height;

    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;    
    ctx.fillStyle = "rgb(" + please.masks.default_color.join(",") + ")";
    ctx.fillRect(0, 0, width, height);

    please.media.assets[paths.mask] = canvas;
    please.masks.__generate(file_name);
};




please.masks.__generate = function (file_name) {
    console.warn("Not implemented: please.masks.__generate");
    var paths = please.masks.__find(file_name);
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
};