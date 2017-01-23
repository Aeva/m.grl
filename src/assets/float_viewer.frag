
uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;

uniform float min_value;
uniform float max_value;
uniform sampler2D float_buffer;

include("normalize_screen_coord.glsl");


void main(void) {
  vec2 tcoords = normalize_screen_coord(gl_FragCoord.xy);
  vec4 color = texture2D(float_buffer, tcoords);
  gl_FragColor = clamp((color - min_value) / distance(min_value, max_value), 0.0, 1.0);
}
