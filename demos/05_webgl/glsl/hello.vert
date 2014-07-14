

attribute vec3 vert_position;
uniform mat4 mv_matrix;
uniform mat4 p_matrix;

  
void main(void) {
  gl_Position = p_matrix * mv_matrix * vec4(vert_position, 1.0);
}
