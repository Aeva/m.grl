//

var write = function (msg) {
    document.getElementById("page").innerHTML += msg + "<br/>";
};


var draw_container = function (inner_html, id) {
    
    var msg = "<div class='ani_frame'><div";
    if (id !== undefined) {
        msg += " id='" + id + "'";
    }
    msg += ">" + inner_html + "</div></div>";
    document.getElementById("page").innerHTML += msg;
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

    var clip_x = sprite.x * -1;
    var clip_y = sprite.y * -1;
    html += "position: absolute;";
    html += "display: block;";
    html += "background-image: url('" + src + "');";
    html += "background-position: " + clip_x + "px " + clip_y + "px;";
    html += "width: " + sprite.w + "px;";
    html += "height: " + sprite.h + "px;";
    html += "left: " + x + "px;";
    html += "top: " + y + "px;";
    return html + '"></div>';
};


// This function takes an animation object as returned by
// please.access("ani", foo), and a frame object (you can find these
// in ani_obj.__frames[i]).
var draw_frame = function (ani_object, frame) {
    var html = ""
    for (var s=0; s<frame.length; s+=1) {
        var inst = frame[s];
        var id = inst.sprite;
        var x = inst.x;
        var y = inst.y;
        html += sprite2html(ani_object, id, x, y);
    }
    return html;
};


var animations = [];
var ani_callback = function (status, uri) {
    if (status === "pass") {
        var template = please.access(uri);
        var ani = template.create();

        var stamp = "ani_test_" + Math.floor(Math.random()*Math.pow(2,64));
        draw_container("", stamp);
        ani.dir = Math.floor(Math.random()*4);

        ani.on_dirty = function (ani, frame) {
            var container = document.getElementById(stamp);
            var html = draw_frame(ani, frame);
            container.innerHTML = html;
        };
        animations.push(ani);
    }
    else {
        write("!!! " + status + " for " + uri);
    }
};


// changes directions and sprites
var randomize = function () {
    var outfits = [
        "green_outfit.png",
        "red_outfit.png",
        "princess_dress.png",
        "hunk_body.png",
        "skeleton_body.png",
    ];
    var hair_styles = ["hair_mohawk.png", "hair_messy.png", "hair_princess.png"]
    for (var i=0; i<animations.length; i+=1) {
        var actor = animations[i];
        actor.dir = Math.floor(Math.random()*4);
        var b = Math.floor(Math.random()*outfits.length);
        var h = Math.floor(Math.random()*hair_styles.length);
        actor.attrs.hair = hair_styles[h];
        actor.attrs.body = outfits[b];

        if (actor.attrs.body === "hunk_body.png") {
            actor.attrs.head = "head3.png";
        }
        else if (actor.attrs.body === "skeleton_body.png") {
            actor.attrs.head = "skeleton_head.png";
            actor.attrs.hair = undefined;
        }
        else {
            actor.attrs.head = "head2.png";
        }
        if (Math.floor(Math.random()*10) === 0) {
            actor.attrs.head = "skeleton_head.png";
        }
    }
    setTimeout(randomize, 5000);
};


var cached = [];
var notify_download = function (uri) {
    if (please.media.assets.hasOwnProperty(uri) && 
        uri !== "error" &&
        cached.indexOf(uri) === -1) {

        write("cached: " + "<a href='"+uri+"'>"+uri+"</a>");
        cached.push(uri);
    }
};


var resources_loaded = function () {
    write("<br/>");
    for (var prop in please.media.assets) {
        notify_download(prop);
    }
    randomize();
    for (var i=0; i<animations.length; i+=1) {
        animations[i].play();
    }
};


addEventListener("load", function () {
    please.media.search_paths.img = "./sprites/";
    please.media.search_paths.ani = "./keyframes/";
    please.media.search_paths.audio = "./sounds/";

    var ganis = ["idle", "walk", "magic", "fall"];
    for (var i=0; i<ganis.length; i+=1) {
        var file = ganis[i] + ".gani";
        var uri = please.relative("ani", file);
        please.load("ani", uri, ani_callback);
    }

    please.media.connect_onload(resources_loaded);
});