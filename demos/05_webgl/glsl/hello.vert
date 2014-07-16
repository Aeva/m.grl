
attribute vec3 vert_position;

uniform mat4 mv_matrix;
uniform mat4 p_matrix;

varying vec3 local_position;
varying vec4 adjusted_position;

  
void main(void) {
  local_position = vert_position;
  adjusted_position = p_matrix * mv_matrix * vec4(vert_position, 1.0);
  gl_Position = adjusted_position;
}
