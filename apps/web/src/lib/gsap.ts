import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/* Registered exactly once. Import gsap and ScrollTrigger from here, never
   from the packages directly, so a second registration can't happen. */
gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
