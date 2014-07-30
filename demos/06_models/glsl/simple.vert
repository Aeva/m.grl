
attribute vec3 position;
attribute vec3 normal;
attribute vec2 tcoord;

uniform mat4 camera;
uniform mat4 offset;
uniform mat4 projection;

varying vec3 local_position;
varying vec3 local_normal;
varying vec2 local_tcoord;

varying vec3 global_position;
varying vec3 camera_position;

void main(void) {
  local_position = position;
  local_normal = normal;
  local_tcoord = tcoord;
  global_position = (offset * vec4(position, 1.0)).xyz;
  vec4 tmp = projection * camera * offset * vec4(position, 1.0);
  camera_position = tmp.xyz;
  gl_Position = tmp;
}
