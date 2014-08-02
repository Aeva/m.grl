
// general stuff
attribute vec3 position;
attribute vec3 normal;
attribute vec2 tcoord;
uniform mat4 model_matrix;
uniform mat4 view_matrix;
uniform mat4 projection_matrix;

// used for lighting calculation
uniform mat4 nega_camera_matrix; // inverse "view" matrix
uniform vec3 camera_coords; // coordinate of "eye"
uniform vec3 light_coords;  // coordinate of "light"
varying vec3 view_vector;
varying vec3 light_vector;

// useful stuff in local coordinate
varying vec3 local_position;
varying vec3 local_normal;
varying vec2 local_tcoord;

varying vec3 global_position; // model vertex in world coordinates
varying vec3 camera_position; // model vertex in screen coordinates


mat3 create_tangent_mat() {
  // Calculates the tangent and binormal for a given normal.
  //
  // References:
  // https://stackoverflow.com/questions/5255806/how-to-calculate-tangent-and-binormal
  // http://www.gamedev.net/topic/571707-how-to-calculate-tangent-binormal-normal-vectors-thanks/

  vec3 tangent;
  vec3 binormal;
  vec3 c1 = cross(normal, vec3(0.0, 0.0, 1.0));
  vec3 c2 = cross(normal, vec3(0.0, 1.0, 0.0));
  if (length(c1) > length(c2)) {
    tangent = c1;
  }
  else {
    tangent = c2;
  }
  tangent = normalize(tangent);
  binormal = normalize(cross(normal, tangent)); // is "v_nglNormal" something else?
  return mat3(tangent, binormal, normal);
}

vec3 world_coords(vec3 view_coords) {
  return (nega_camera_matrix * vec4(view_coords, 1.0)).xyz;
}


void lighting_stuff() {
  // Creates vectors for the light and view, expressed in tangent
  // space.
  //
  // References:
  // OpenGL ES 2.0 Programming Guide

  // move camera and light into world coordinates
  vec3 eye_position_world = world_coords(camera_coords);
  vec3 light_position_world = world_coords(light_coords);
  
  // create view and light vectors in world coordinates
  vec3 view_dir_world = (eye_position_world - position.xyz);
  vec3 light_dir_world = (light_coords - position.xyz);

  // translate those vectors to tangent space
  mat3 tangent_matrix = create_tangent_mat();
  view_vector = view_dir_world * tangent_matrix;
  light_vector = light_dir_world * tangent_matrix;
}


void main(void) {
  local_position = position;
  local_normal = normal;
  local_tcoord = tcoord;
  
  global_position = (model_matrix * vec4(position, 1.0)).xyz;
  vec4 tmp = projection_matrix * view_matrix * model_matrix * vec4(position, 1.0);
  camera_position = tmp.xyz;
  
  lighting_stuff();

  gl_Position = tmp;
}
