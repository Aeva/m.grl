

varying vec3 world_position;
uniform float uv_offset;
const float checker_scale = 1.0;


vec4 chess_pattern() {
  vec4 color = vec4(0.2, 0.2, 0.2, 1.0);
  float x_coord = world_position.x + (uv_offset);
  bool check_x = fract(x_coord / checker_scale) < 0.5;
  bool check_y = fract(world_position.y / checker_scale) < 0.5;
  if ((check_x && check_y) || (!check_x && !check_y)) {
    color = vec4(0.8, 0.8, 0.8, 1.0);
  }
  return color;
}
