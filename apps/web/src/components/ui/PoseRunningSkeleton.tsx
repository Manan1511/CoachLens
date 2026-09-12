import { useEffect, useRef } from 'react';

/** Pure animated skeleton representing human pose tracking (MediaPipe /
 *  OpenCV BlazePose style). Clean, sharp white nodes and skeletal lines
 *  with a deliberate, smooth running gait cycle — zero surrounding UI. */

export function PoseRunningSkeleton({ className = '' }: { className?: string }) {
  const canvasRef = useRef<SVGSVGElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // References to dynamic SVG elements for direct 60fps DOM updates
  const elementsRef = useRef<{
    nodes: Map<string, SVGCircleElement>;
    bones: Map<string, SVGLineElement>;
  }>({
    nodes: new Map(),
    bones: new Map(),
  });

  useEffect(() => {
    const svg = canvasRef.current;
    if (!svg) return;

    // Cache element references for zero-allocation rendering
    const nodes = new Map<string, SVGCircleElement>();
    svg.querySelectorAll<SVGCircleElement>('[data-node]').forEach((el) => {
      const key = el.getAttribute('data-node');
      if (key) nodes.set(key, el);
    });

    const bones = new Map<string, SVGLineElement>();
    svg.querySelectorAll<SVGLineElement>('[data-bone]').forEach((el) => {
      const key = el.getAttribute('data-bone');
      if (key) bones.set(key, el);
    });

    elementsRef.current = { nodes, bones };

    const startTime = performance.now();

    function render(now: number) {
      const elapsed = (now - startTime) / 1000;

      // --- Biomechanical Running Gait Cycle Math ---
      // Cadence: ~0.55 cycles per second (slow, smooth, deliberate gait)
      const cadence = 0.55;
      const t = elapsed * cadence * Math.PI * 2;

      // Base coordinates (centered in viewBox 360x460)
      const originX = 175;
      const originY = 225;

      // Pelvis vertical bounce (double harmonic: two cycles per stride)
      const bounce = Math.abs(Math.sin(t)) * 14;
      const sway = Math.sin(t) * 5;

      const hipCenter = { x: originX + sway, y: originY - bounce };

      // Trunk posture (forward athletic lean ~14 deg + subtle breathing oscillation)
      const trunkLean = 0.24 + 0.03 * Math.sin(t);
      const spineLength = 108;
      const shoulderCenter = {
        x: hipCenter.x + Math.sin(trunkLean) * spineLength,
        y: hipCenter.y - Math.cos(trunkLean) * spineLength,
      };

      // Head & Face
      const neck = {
        x: shoulderCenter.x + 8,
        y: shoulderCenter.y - 18,
      };
      const nose = { x: neck.x + 22, y: neck.y - 24 };
      const leftEye = { x: nose.x - 4, y: nose.y - 5 };
      const leftEar = { x: neck.x - 6, y: neck.y - 22 };

      // Hips (near and far)
      const hipOffset = 8;
      const nearHip = { x: hipCenter.x + hipOffset, y: hipCenter.y };
      const farHip = { x: hipCenter.x - hipOffset, y: hipCenter.y - 4 };

      // Shoulders (near and far)
      const nearShoulder = { x: shoulderCenter.x + 10, y: shoulderCenter.y + 4 };
      const farShoulder = { x: shoulderCenter.x - 10, y: shoulderCenter.y - 4 };

      // --- Leg Kinematics (Forward Kinematics) ---
      const thighLen = 92;
      const shankLen = 88;

      function computeLeg(phase: number, hip: { x: number; y: number }) {
        // Hip flexion/extension
        const hipAngle = 0.55 * Math.sin(phase) + 0.12;

        // Knee flexion: knee bends during forward swing, straightens in stance/extension
        const swingFlexion = Math.max(0, Math.sin(phase - 0.4));
        const kneeFlexion = 0.22 + 1.15 * (swingFlexion * swingFlexion);

        const kneeX = hip.x + Math.sin(hipAngle) * thighLen;
        const kneeY = hip.y + Math.cos(hipAngle) * thighLen;

        const shankAngle = hipAngle - kneeFlexion;
        const ankleX = kneeX + Math.sin(shankAngle) * shankLen;
        const ankleY = kneeY + Math.cos(shankAngle) * shankLen;

        // Foot (heel and toe)
        const heelX = ankleX - 12;
        const heelY = ankleY + 8;
        const toeX = ankleX + 22;
        const toeY = ankleY + 8;

        return {
          knee: { x: kneeX, y: kneeY },
          ankle: { x: ankleX, y: ankleY },
          heel: { x: heelX, y: heelY },
          toe: { x: toeX, y: toeY },
        };
      }

      // Near leg (phase t) & Far leg (phase t + PI)
      const nearLeg = computeLeg(t, nearHip);
      const farLeg = computeLeg(t + Math.PI, farHip);

      // --- Arm Kinematics ---
      const upperArmLen = 64;
      const forearmLen = 56;

      function computeArm(phase: number, shoulder: { x: number; y: number }) {
        // Arm swings opposite to same-side leg
        const shoulderAngle = -0.65 * Math.sin(phase) - 0.15;
        const elbowFlexion = 1.15 + 0.45 * Math.cos(phase);

        const elbowX = shoulder.x + Math.sin(shoulderAngle) * upperArmLen;
        const elbowY = shoulder.y + Math.cos(shoulderAngle) * upperArmLen;

        const forearmAngle = shoulderAngle + elbowFlexion;
        const wristX = elbowX + Math.sin(forearmAngle) * forearmLen;
        const wristY = elbowY + Math.cos(forearmAngle) * forearmLen;

        return {
          elbow: { x: elbowX, y: elbowY },
          wrist: { x: wristX, y: wristY },
        };
      }

      // Near arm swings with far leg (t + PI), Far arm with near leg (t)
      const nearArm = computeArm(t + Math.PI, nearShoulder);
      const farArm = computeArm(t, farShoulder);

      // --- Update SVG Elements ---
      const { nodes: n, bones: b } = elementsRef.current;

      function setNode(key: string, p: { x: number; y: number }) {
        const el = n.get(key);
        if (el) {
          el.setAttribute('cx', p.x.toFixed(1));
          el.setAttribute('cy', p.y.toFixed(1));
        }
      }

      function setBone(key: string, p1: { x: number; y: number }, p2: { x: number; y: number }) {
        const el = b.get(key);
        if (el) {
          el.setAttribute('x1', p1.x.toFixed(1));
          el.setAttribute('y1', p1.y.toFixed(1));
          el.setAttribute('x2', p2.x.toFixed(1));
          el.setAttribute('y2', p2.y.toFixed(1));
        }
      }

      // 1. Far Limbs (drawn behind, subtle depth separation)
      setNode('far_shoulder', farShoulder);
      setNode('far_elbow', farArm.elbow);
      setNode('far_wrist', farArm.wrist);
      setBone('bone_far_upper_arm', farShoulder, farArm.elbow);
      setBone('bone_far_forearm', farArm.elbow, farArm.wrist);

      setNode('far_hip', farHip);
      setNode('far_knee', farLeg.knee);
      setNode('far_ankle', farLeg.ankle);
      setNode('far_heel', farLeg.heel);
      setNode('far_toe', farLeg.toe);
      setBone('bone_far_thigh', farHip, farLeg.knee);
      setBone('bone_far_shin', farLeg.knee, farLeg.ankle);
      setBone('bone_far_foot', farLeg.heel, farLeg.toe);

      // 2. Torso & Head
      setNode('hip_center', hipCenter);
      setNode('shoulder_center', shoulderCenter);
      setNode('neck', neck);
      setNode('nose', nose);
      setNode('left_eye', leftEye);
      setNode('left_ear', leftEar);

      setBone('bone_spine', hipCenter, shoulderCenter);
      setBone('bone_neck', shoulderCenter, neck);
      setBone('bone_head', neck, nose);
      setBone('bone_eye', nose, leftEye);
      setBone('bone_ear', leftEye, leftEar);
      setBone('bone_shoulder_line', farShoulder, nearShoulder);
      setBone('bone_hip_line', farHip, nearHip);

      // 3. Near Limbs (drawn in front, bright sharp white)
      setNode('near_hip', nearHip);
      setNode('near_knee', nearLeg.knee);
      setNode('near_ankle', nearLeg.ankle);
      setNode('near_heel', nearLeg.heel);
      setNode('near_toe', nearLeg.toe);
      setBone('bone_near_thigh', nearHip, nearLeg.knee);
      setBone('bone_near_shin', nearLeg.knee, nearLeg.ankle);
      setBone('bone_near_foot', nearLeg.heel, nearLeg.toe);

      setNode('near_shoulder', nearShoulder);
      setNode('near_elbow', nearArm.elbow);
      setNode('near_wrist', nearArm.wrist);
      setBone('bone_near_upper_arm', nearShoulder, nearArm.elbow);
      setBone('bone_near_forearm', nearArm.elbow, nearArm.wrist);

      animFrameRef.current = requestAnimationFrame(render);
    }

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        ref={canvasRef}
        viewBox="0 0 360 460"
        className="h-auto max-h-[70vh] w-full max-w-[340px]"
        aria-label="Pure human pose tracking skeleton animation"
      >
        {/* --- Bones (Connecting wireframe lines) --- */}
        {/* Far limbs: slightly dimmer white for clear 2.5D depth perception */}
        <g stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1.8" strokeLinecap="round">
          <line data-bone="bone_far_upper_arm" />
          <line data-bone="bone_far_forearm" />
          <line data-bone="bone_far_thigh" />
          <line data-bone="bone_far_shin" />
          <line data-bone="bone_far_foot" />
        </g>

        {/* Far nodes: sharp solid circles */}
        <g fill="rgba(255, 255, 255, 0.5)">
          <circle data-node="far_shoulder" r="3.5" />
          <circle data-node="far_elbow" r="3" />
          <circle data-node="far_wrist" r="3" />
          <circle data-node="far_hip" r="3.5" />
          <circle data-node="far_knee" r="4" />
          <circle data-node="far_ankle" r="3.5" />
          <circle data-node="far_heel" r="2.5" />
          <circle data-node="far_toe" r="2.5" />
        </g>

        {/* Torso & Head bones */}
        <g stroke="#ffffff" strokeWidth="2" strokeLinecap="round">
          <line data-bone="bone_spine" />
          <line data-bone="bone_neck" />
          <line data-bone="bone_head" />
          <line data-bone="bone_eye" strokeWidth="1.2" />
          <line data-bone="bone_ear" strokeWidth="1.2" />
          <line data-bone="bone_shoulder_line" strokeWidth="1.5" strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.6)" />
          <line data-bone="bone_hip_line" strokeWidth="1.5" strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.6)" />
        </g>

        {/* Near limbs: crisp solid pure white */}
        <g stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round">
          <line data-bone="bone_near_upper_arm" />
          <line data-bone="bone_near_forearm" />
          <line data-bone="bone_near_thigh" />
          <line data-bone="bone_near_shin" />
          <line data-bone="bone_near_foot" />
        </g>

        {/* Near & Central Tracking Nodes: sharp, solid white dots without glows */}
        <g fill="#ffffff">
          <circle data-node="hip_center" r="3.5" fill="rgba(255, 255, 255, 0.75)" />
          <circle data-node="shoulder_center" r="4" fill="rgba(255, 255, 255, 0.75)" />
          <circle data-node="neck" r="3.5" />
          <circle data-node="nose" r="3.5" />
          <circle data-node="left_eye" r="2.5" />
          <circle data-node="left_ear" r="2.5" />

          <circle data-node="near_shoulder" r="4.5" />
          <circle data-node="near_elbow" r="3.5" />
          <circle data-node="near_wrist" r="3.5" />

          <circle data-node="near_hip" r="4.5" />
          <circle data-node="near_knee" r="5" />
          <circle data-node="near_ankle" r="4" />
          <circle data-node="near_heel" r="3" />
          <circle data-node="near_toe" r="3" />
        </g>
      </svg>
    </div>
  );
}
