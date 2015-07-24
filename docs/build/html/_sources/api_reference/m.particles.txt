

m.particles.js
==============

please.ParticleEmitter
----------------------
*please.ParticleEmitter* **(asset, span, limit, setup, update, ext)**

Creates a new particle system tracker. The asset parameter is the result
of please.access(...), and can be an image object, a gani object, or a
jta model object. This determines the appearance of the particle.

The span parameter is either a number or a function that returns a
number, and determines the life of a particle in miliseconds.

The limit parameter is the maximum number of particles to be displayed
in the system.

The setup parameter is a callback used for defining the particle upon
creation.

The update parameter is a callback used for updating the particle
periodically, facilitating the animation of the particle.

The ext parameter is used to define what variables are available to the
particles in the system beyond the defaults.


