
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif


// render pass
uniform int render_pass;

// attributes
varying vec3 local_position;
varying vec3 local_normal;
varying vec3 world_position;
varying vec3 world_normal;
varying vec3 view_position;

// lighting stuff
uniform vec3 light_direction;
varying vec3 light_weight;
varying float directional_weight;




void main(void) {

  vec4 frag_color = vec4(1.0, 1.0, 1.0, 1.0);


  if (render_pass == 1) {
    // LIGHTING PASS
    frag_color = vec4(vec3(frag_color.rgb*light_weight), 1.0);

    // specular stuff
    vec3 eye_vector = normalize(-view_position);
    vec3 reflection = reflect(light_direction, normalize(world_normal));
    float shiny = 2.0;
    float specular_weight = pow(max(dot(reflection, eye_vector), 0.0), shiny);

    vec4 k_specular = vec4(1.0, 0.8, 0.9, 1.0);

    frag_color = mix(frag_color, k_specular, specular_weight);
  }


  else if(render_pass == 2) {
    // HALFTONE PASS
    frag_color = vec4(0.25, 0.5, 0.0, 1.0);

  }


  gl_FragColor = frag_color;
}
