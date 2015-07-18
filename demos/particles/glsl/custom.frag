
precision mediump float;

uniform sampler2D diffuse_texture;

uniform float alpha;
uniform bool is_sprite;
uniform bool is_transparent;
uniform float mgrl_frame_start;

varying vec3 local_position;
varying vec3 local_normal;
varying vec2 local_tcoords;
varying vec3 world_position;
varying vec3 screen_position;

uniform bool is_floor;


void main(void) {
  vec4 diffuse;
  if (is_floor) {
    // generate a procedural texture for the floor
    float checker_scale = 8.0;
    bool check_x = fract((world_position.x+2.0) / checker_scale) < 0.5;
    bool check_y = fract((world_position.y-2.0) / checker_scale) < 0.5;
    if ((check_x && check_y) || (!check_x && !check_y)) {
      //diffuse = vec4(0.8, 0.8, 0.8, 1.0);
      diffuse = vec4(0.3, 0.3, 0.3, 1.0);
    }
    else {
      diffuse = vec4(0.37, 0.6, 0.14, 1.0);
    }
  }
  else {
    diffuse = texture2D(diffuse_texture, local_tcoords);
    if (is_sprite) {
      float cutoff = is_transparent ? 0.1 : 1.0;
      if (diffuse.a < cutoff) {
        discard;
      }
    }
    diffuse.a *= alpha;
  }
  gl_FragColor = diffuse;
}
