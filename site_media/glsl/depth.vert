
attribute vec3 position;

uniform mat4 view_matrix;
uniform mat4 projection_matrix;

binding_context GraphNode {
  uniform mat4 world_matrix;
}

uniform float depth_of_field;
uniform float focal_distance;

varying vec4 coord;
varying float depth;
varying float origin;


float normalize_depth(float scalar) {
  return (scalar - gl_DepthRange.near) / gl_DepthRange.diff;
}


void main(void) {
  depth = normalize_depth(depth_of_field);
  origin = normalize_depth(focal_distance);
  coord = projection_matrix * view_matrix * world_matrix * vec4(position, 1.0);
  gl_Position = coord;
}
