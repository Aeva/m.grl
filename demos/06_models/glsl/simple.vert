
attribute vec3 position;
attribute vec3 normal;
attribute vec2 tcoord;

uniform mat4 modelview;
uniform mat4 projection;

varying vec3 local_position;
varying vec3 local_normal;
varying vec2 local_tcoord;

void main(void) {
  local_position = position;
  local_normal = normal;
  local_tcoord = tcoord;
  gl_Position = projection * modelview * vec4(position, 1.0);
}
