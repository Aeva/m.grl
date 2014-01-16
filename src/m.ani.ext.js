// - m.ani.ext.js ----------------------------------------------------------- //


please.ani.on_bake_ani_frameset = function (uri, ani) {
    var attrs = ani.__attrs || ani.attrs;
    var frames = ani.frames;
    var sprites = ani.sprites;
    var cache_id = please.ani.get_cache_name(uri, attrs);
    var single_dir = ani.data === undefined ? ani.single_dir : ani.data.single_dir;
    var cache = [];
    var ani = please.access(uri, true);

    ITER(i, frames) {
        var _frame = frames[i];
        if (single_dir) {
            var result = please.ani.__cache_frame(ani, _frame.data[0]);
            cache.push(result);
        }
        else {
            var dirs = [];
            for (var d=0; d<4; d+=1) {
                var result = please.ani.__cache_frame(ani, _frame.data[d]);
                dirs.push(result);
            }
            cache.push(dirs);
        }
    };
};


please.ani.__cache_frame = function (ani, frame) {
    var xs = [];
    var ys = [];

    ITER(i, frame) {
        var sprite = ani.sprites[frame[i].sprite];
        var x = frame[i].x;
        var y = frame[i].y;
        var w = sprite.w
        var h = sprite.h
        xs.push(x);
        ys.push(y);
        xs.push(x+w);
        ys.push(y+h);
    };

    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    
    var offset_x = Math.min.apply(null, xs);
    var offset_y = Math.min.apply(null, ys);

    canvas.width = Math.max.apply(null, xs) - offset_x;
    canvas.height = Math.max.apply(null, ys) - offset_y;

    ITER(i, frame) {
        var sprite = ani.sprites[frame[i].sprite];
     
    };

    console.info("" + canvas.width + ", " + canvas.height);
};