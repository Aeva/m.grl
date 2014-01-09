//

var demo = {
    "__phys" : false,
    

    "get_wall" : function (x, y) {},
    "setup" : function (){},
};


demo.get_wall = function (x, y) {
    var data;
    if (0 <= x < 32 && 0 <= y < 32) {
        data = demo.__phys.ctx.getImageData(x, y, 1, 1)
        return data.data[0] === 0;
    }
    else {
        return true;
    }
};


demo.setup = function () {
    // setup physics info
    var canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    var ctx = canvas.getContext("2d");
    var img = please.access("cave_physics.png");
    ctx.drawImage(img, 0, 0);
    demo.__phys = {
        "canvas" : canvas,
        "ctx" : ctx,
    }

    // remove loading screen
    var game_el = document.getElementById("game");
    game_el.className = "";

    
};


addEventListener("load", function () {
    please.media.search_paths.img = "../lpc_assets/sprites/";
    please.media.search_paths.ani = "../lpc_assets/keyframes/";
    please.media.search_paths.audio = "../lpc_assets/sounds/";

    Array.map([
        "idle.gani",
        "walk.gani",
        "coin.gani",
        "cave_base.png",
        "cave_overhangs.png",
        "cave_physics.png",
    ], function (asset, i) {
        please.relative_load("guess", asset);
    });

    please.media.connect_onload(demo.setup);
});