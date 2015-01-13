
uniform mat4 world_matrix;
uniform mat4 view_matrix;
uniform mat4 projection_matrix;
attribute vec3 position;

varying vec4 coord;
varying float scale;

void main(void) {
  coord = projection_matrix * view_matrix * world_matrix * vec4(position, 1.0);
  scale = gl_DepthRange.far;
  gl_Position = coord;
}
