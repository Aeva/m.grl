
uniform mat4 world_matrix;
uniform mat4 view_matrix;
uniform mat4 projection_matrix;
attribute vec3 position;


void main(void) {
  gl_Position = projection_matrix * view_matrix * world_matrix * vec4(position, 1.0);
}
