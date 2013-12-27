//


window.addEventListener("load", function () {
    please.enable_input();


    var RegisterSprite = function (group_name, keys) {
        // constructor, I guess

        var self = this;
        this.handler = new please.create_input_handler(group_name, keys);

        var fps = 60;
        var shown_state = false;
        var shown_text = "idle";
        var draw = function draw() {
	    var suffix = (Math.floor((Date.now()/1000)*4.0) % 2) ? "_a" : "_b";
	    var adjusted_state = "idle";
	    if (self.handler.state == "long" || self.handler.state=="short") {
	        var adjusted_state = self.handler.state + suffix;
	    }

	    if (adjusted_state != shown_state) {
	        var sprite = document.getElementById(group_name);
	        sprite.setAttribute("class", adjusted_state);
	        if (shown_text !== self.handler.state) {
		    shown_text = self.handler.state;
		    sprite.textContent = self.handler.state;
	        }
	    }
        };
        var timer = window.setInterval(draw, 1000/fps);
    };


    var walk = new RegisterSprite ("walk", [37, 38, 39, 40]);
    var action = new RegisterSprite ("action", [65]);
});