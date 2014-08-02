
// general stuff
attribute vec3 position;
attribute vec3 normal;
attribute vec2 tcoord;
uniform mat4 model_matrix;
uniform mat4 view_matrix;
uniform mat4 projection_matrix;

// vertex info in various coordinate spaces
varying vec3 local_position;
varying vec3 local_normal;
varying vec2 local_tcoord;
varying vec3 world_position;
varying vec3 view_position;


void main(void) {
  local_position = position;
  local_normal = normal;
  local_tcoord = tcoord;
  
  global_position = (model_matrix * vec4(position, 1.0)).xyz;
  vec4 tmp = projection_matrix * view_matrix * model_matrix * vec4(position, 1.0);
  camera_position = tmp.xyz;

  gl_Position = tmp;
}
