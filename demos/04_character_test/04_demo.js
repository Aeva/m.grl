//


window.addEventListener("load", function () {
    please.enable_input();

    var key_codes = [37, 38, 39, 40];
    var dir_handler = new please.create_input_handler("arrows", key_codes);

    var ani_state = "idle";
    var dir = 2;

    var this_not_that = function (set, has, hasnot) {
        return (set.indexOf(has) !== -1 && set.indexOf(hasnot) === -1);
    }

    dir_handler.on_state_change = function (state, active) {
        if (active.length > 0) {
            for (var i=0; i<active.length; i+=1) {
                var new_dir = dir;
                if (this_not_that(active, 38, 40)) {
                    new_dir = 0;
                }
                if (this_not_that(active, 40, 38)) {
                    new_dir = 2;
                }
                if (this_not_that(active, 37, 39)) {
                    new_dir = 3;
                }
                if (this_not_that(active, 39, 37)) {
                    new_dir = 4;
                }
                if (new_dir !== dir) {
                    dir = new_dir;
                    console.info(dir);
                }
            }
        }
    };


});