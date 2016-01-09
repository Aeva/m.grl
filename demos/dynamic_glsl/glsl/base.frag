
include("ext.frag");


swappable vec3 diffuse_color() {
  return vec3(0.0, 0.0, 0.0);
}


void main() {
  gl_FragColor = vec4(diffuse_color(), 1.0);
}
