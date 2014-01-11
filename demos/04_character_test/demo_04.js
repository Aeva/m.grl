//

var demo = {
    "__phys" : undefined,
    "player" : undefined,
    "actors" : [],
    "__keys" : {},

    "get_wall" : function (x, y) {},
    "actors_at" : function (x, y) {},
    "setup" : function (){},
};


demo.key_handler = function (state, key) {
    demo.__keys[key] = state === "press";
    var keys = demo.__keys;
    var new_dir;
    var walking = false;
    
    if (keys.a && !keys.d) {
        new_dir = 1;
        walking = true;
    }
    else if (keys.d && !keys.a) {
        new_dir = 3;
        walking = true;
    }
    else if (keys.w && !keys.s) {
        new_dir = 0;
        walking = true;
    }
    else if (keys.s && !keys.w) {
        new_dir = 2;
        walking = true;
    }


    console.info(new_dir);
    
    if (new_dir !== undefined) {
        demo.player.dir = new_dir;
    }
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


// Generate html that describes a sprite instance.
var sprite2html = function (ani_object, sprite_id, x, y) {
    var sprite = ani_object.sprites[sprite_id];
    if (sprite.resource === undefined) {
        return "";
    }
    var html = '<div style="';
    
    var uri = please.relative("img", sprite.resource);
    if (please.access(uri, true) === undefined) {
        please.load("img", uri, function(state, uri) {
            if (state === "pass") {
	        ani_object.__set_dirty();
                notify_download(uri);
            }
        });
    }
    var src = please.access(uri).src;
    var is_error = please.access(uri).src === please.access("error").src;

    var clip_x = sprite.x * -1;
    var clip_y = sprite.y * -1;
    html += "position: absolute;";
    html += "display: block;";
    html += "background-image: url('" + src + "');";
    if (is_error) {
        html += "background-size:" + sprite.w + "px " + sprite.h+"px;";
    }
    else {
        html += "background-position: " + clip_x + "px " + clip_y + "px;";
    }
    html += "width: " + sprite.w + "px;";
    html += "height: " + sprite.h + "px;";
    html += "left: " + x + "px;";
    html += "top: " + y + "px;";
    return html + '"></div>';
};


demo.Actor = function (initial_animation) {
    /*
      Constructor function, handles animation things, physics, etc.
     */
    var actor = {
        "__attr_cache" : {},
        "__ani_name" : undefined,
        "__ani" : undefined,
        "__div" : undefined,
        "__x" : 0,
        "__y" : 0,
        
        // callbacks
        "__attach_ani" : function (uri) {},
        "__render" : function (ani, frame_data) {},
    };

    Object.defineProperty(actor, "dir", {
        "get" : function () {
            return actor.__ani.dir;
        },
        "set" : function (value) {
            if (actor.__ani) {
                return actor.__ani.dir = value;
            }
            else {
                undefined;
            }
        },
    });

    Object.defineProperty(actor, "ani", {
        "get" : function () {
            return actor.__ani_name;
        },
        "set" : function (value) {
            if (actor.__ani_name !== value) {
                actor.__ani_name = value;
                please.relative_load("guess", value, function (status, uri) {
                    actor.__attach_ani(uri);
                });
            }
            return actor.__ani_name;
        },
    });

    Object.defineProperty(actor, "x", {
        "get" : function () {
            return actor.__x;
        },
        "set" : function (value) {
            if (actor.__div !== undefined) {
                actor.__div.style.left = ""+(value*16)+"px";
            }
            return actor.__x = value;
        },
    });

    Object.defineProperty(actor, "y", {
        "get" : function () {
            return actor.__y;
        },
        "set" : function (value) {
            if (actor.__div !== undefined) {
                actor.__div.style.top = ""+(value*16)+"px";
                actor.__div.style.zIndex = 200 + 16*value;
            }
            return actor.__y = value;
        },
    });

    Object.defineProperty(actor, "attrs", {
        "get" : function () {
            if (actor.__ani) {
                return actor.__ani.attrs;
            }
            return actor.__attr_cache;
        },
    });


    // Callback to setup the animation.
    actor.__attach_ani = function (uri) {
        var ani = please.access(uri, true);
        if (ani) {
            var old_attrs = actor.attrs;
            actor.__ani = ani.create();
            actor.__ani.on_change_reel = function (ani, new_ani) { actor.ani = new_ani; };
            actor.__ani.on_dirty = actor.__render;
            actor.__ani.play();
            for (var copy in old_attrs) {
                if (actor.__ani.attrs.hasOwnProperty(copy)) {
                    actor.__ani.attrs[copy] = old_attrs[copy];
                }
            }
        }
    };

    //
    actor.__render = function (ani, frame) {
        var html = ""
        for (var s=0; s<frame.length; s+=1) {
            var inst = frame[s];
            var id = inst.sprite;
            var x = inst.x;
            var y = inst.y;
            html += sprite2html(ani, id, x, y);
        }
        if (actor.__div !== undefined) {
            actor.__div.innerHTML = html;
        }
    };

    var char_layer = document.getElementById("chars");
    actor.__div = document.createElement("div");
    actor.__div.className = "actor";
    char_layer.appendChild(actor.__div);
    actor.ani = initial_animation;
    demo.actors.push(actor);

    return actor;
};


demo.spawn_coin = function (x, y) {
    var coins = [
        "misc/copper_coin.png",
        "misc/copper_coin.png",
        "misc/copper_coin.png",
        "misc/copper_coin.png",
        "misc/copper_coin.png",
        "misc/silver_coin.png",
        "misc/silver_coin.png",
        "misc/silver_coin.png",
        "misc/silver_coin.png",
        "misc/gold_coin.png",
    ];
    var coin = new demo.Actor("coin.gani");
    coin.x = x;
    coin.y = y;
    coin.attrs.coin = please.random_of(coins);
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
    
    // add some characters
    demo.player = new demo.Actor("idle.gani");
    demo.player.x = 15;
    demo.player.y = 5;

    var coin_chain = function (x, y) {
        var wait = 0;
        if (!(demo.get_wall(x, y) && demo.get_wall(x+1, y))) {
            demo.spawn_coin(x, y);
            wait = 50;
        }
        x += 2;
        if (x >= 32) {
            x = 0;
            y += 2;
        }
        if (y < 32) {
            setTimeout(function(){coin_chain(x, y)}, wait);
        }
    };
    coin_chain(0, 0);

    // remove loading screen
    var game_el = document.getElementById("game");
    game_el.className = "";

    document.getElementById("page").appendChild(demo.__phys.canvas);


    // wireup the controls
    please.keys.enable();
    please.keys.connect("w", demo.key_handler);
    please.keys.connect("a", demo.key_handler);
    please.keys.connect("s", demo.key_handler);
    please.keys.connect("d", demo.key_handler);
};


addEventListener("load", function () {
    please.media.search_paths.img = "../lpc_assets/sprites/";
    please.media.search_paths.ani = "../lpc_assets/keyframes/";
    please.media.search_paths.audio = "../lpc_assets/sounds/";

    // load demo specific assets
    Array.map([
        "cave_base.png",
        "cave_overhangs.png",
        "cave_physics.png",
    ], function (asset) {
        please.load("img", asset);
    });        

    // load assets from lcp_assets repository
    Array.map([
        "idle.gani",
        "walk.gani",
        "coin.gani",
        "misc/gold_coin.png",
        "misc/copper_coin.png",
        "misc/silver_coin.png",
        "misc/emerald_coin.png",
        "misc/ruby_coin.png",
        
    ], function (asset) {
        please.relative_load("guess", asset);
    });

    please.media.connect_onload(demo.setup);
});
