import React, { useEffect, useState } from 'react';
import { AvatarTraits, ExpressionType } from '../../types/avatar';
import { getPlayerTraits, SKIN_TONES, FACE_DIMENSIONS } from '../../lib/avatar-generator';

interface PlayerAvatarWidgetProps {
  nickname: string;
  expression: ExpressionType;
  expressionIntensity: number;
  currentFrame: number;
  playerIndex: number;
}

// Seeded random number generator for consistent blink timing per player
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export const PlayerAvatarWidget: React.FC<PlayerAvatarWidgetProps> = ({
  nickname,
  expression,
  expressionIntensity,
  currentFrame,
  playerIndex,
}) => {
  const traits = getPlayerTraits(nickname);
  const skinColor = SKIN_TONES[traits.skinTone];
  const dimensions = FACE_DIMENSIONS[traits.faceShape];

  // Blink animation: check if currently blinking
  const blinkCycle = 120; // 4 seconds at 30fps
  const blinkSeed = playerIndex * 1000; // Different seed per player
  const cyclePosition = currentFrame % blinkCycle;
  const nextBlinkFrame = Math.floor(seededRandom(blinkSeed + Math.floor(currentFrame / blinkCycle)) * blinkCycle);
  const isBlinking = cyclePosition >= nextBlinkFrame && cyclePosition < nextBlinkFrame + 6;
  const blinkProgress = isBlinking ? (cyclePosition - nextBlinkFrame) / 6 : 0;

  // Bob animation: sinusoidal vertical movement
  const bobCycle = 90; // 3 seconds at 30fps
  const bobOffset = Math.sin((currentFrame / bobCycle) * Math.PI * 2) * 3;

  // Eyebrows rendering based on expression
  const renderEyebrows = () => {
    const baseY = 40 - 16;
    const browWidth = traits.gender === 'female' ? 1.8 : 2.5; // Thinner for women

    if (expression === 'happy') {
      // Raised, curved eyebrows
      const intensity = expressionIntensity;
      return (
        <>
          <path
            d={`M ${50 - 18} ${baseY - 2 * intensity} Q ${50 - 12} ${baseY - 4 * intensity} ${50 - 6} ${baseY - 2 * intensity}`}
            stroke="#4A3428"
            strokeWidth={browWidth}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M ${50 + 6} ${baseY - 2 * intensity} Q ${50 + 12} ${baseY - 4 * intensity} ${50 + 18} ${baseY - 2 * intensity}`}
            stroke="#4A3428"
            strokeWidth={browWidth}
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    }

    if (expression === 'sad') {
      // Angled down eyebrows
      const intensity = expressionIntensity;
      return (
        <>
          <path
            d={`M ${50 - 18} ${baseY + 2 * intensity} L ${50 - 6} ${baseY - 1 * intensity}`}
            stroke="#4A3428"
            strokeWidth={browWidth}
            strokeLinecap="round"
          />
          <path
            d={`M ${50 + 18} ${baseY + 2 * intensity} L ${50 + 6} ${baseY - 1 * intensity}`}
            stroke="#4A3428"
            strokeWidth={browWidth}
            strokeLinecap="round"
          />
        </>
      );
    }

    if (expression === 'frustrated') {
      // Angled inward (concerned/tense)
      return (
        <>
          <path
            d={`M ${50 - 18} ${baseY} L ${50 - 6} ${baseY - 2}`}
            stroke="#4A3428"
            strokeWidth={browWidth}
            strokeLinecap="round"
          />
          <path
            d={`M ${50 + 18} ${baseY} L ${50 + 6} ${baseY - 2}`}
            stroke="#4A3428"
            strokeWidth={browWidth}
            strokeLinecap="round"
          />
        </>
      );
    }

    if (expression === 'angry') {
      // Mildly furrowed — slightly angled inward but not aggressive
      const intensity = expressionIntensity;
      return (
        <>
          <path
            d={`M ${50 - 18} ${baseY + 1 * intensity} L ${50 - 6} ${baseY - 1 * intensity}`}
            stroke="#4A3428"
            strokeWidth={browWidth}
            strokeLinecap="round"
          />
          <path
            d={`M ${50 + 18} ${baseY + 1 * intensity} L ${50 + 6} ${baseY - 1 * intensity}`}
            stroke="#4A3428"
            strokeWidth={browWidth}
            strokeLinecap="round"
          />
        </>
      );
    }

    if (expression === 'eye_roll') {
      // One brow slightly arched — dismissive look
      const intensity = expressionIntensity;
      return (
        <>
          <path
            d={`M ${50 - 18} ${baseY - 1 * intensity} Q ${50 - 12} ${baseY - 3 * intensity} ${50 - 6} ${baseY - 1 * intensity}`}
            stroke="#4A3428"
            strokeWidth={browWidth}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M ${50 + 6} ${baseY - 1 * intensity} Q ${50 + 12} ${baseY - 3 * intensity} ${50 + 18} ${baseY - 1 * intensity}`}
            stroke="#4A3428"
            strokeWidth={browWidth}
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    }

    if (expression === 'talking') {
      // Slightly raised, engaged eyebrows
      const intensity = expressionIntensity;
      return (
        <>
          <path
            d={`M ${50 - 18} ${baseY - 1 * intensity} Q ${50 - 12} ${baseY - 2 * intensity} ${50 - 6} ${baseY - 1 * intensity}`}
            stroke="#4A3428"
            strokeWidth={browWidth}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M ${50 + 6} ${baseY - 1 * intensity} Q ${50 + 12} ${baseY - 2 * intensity} ${50 + 18} ${baseY - 1 * intensity}`}
            stroke="#4A3428"
            strokeWidth={browWidth}
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    }

    // Normal eyebrows
    return (
      <>
        <path
          d={`M ${50 - 18} ${baseY} Q ${50 - 12} ${baseY - 1} ${50 - 6} ${baseY}`}
          stroke="#4A3428"
          strokeWidth={browWidth}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M ${50 + 6} ${baseY} Q ${50 + 12} ${baseY - 1} ${50 + 18} ${baseY}`}
          stroke="#4A3428"
          strokeWidth={browWidth}
          fill="none"
          strokeLinecap="round"
        />
      </>
    );
  };

  // Eye rendering based on expression and blink
  const renderEyes = () => {
    const baseY = 40 - 8;

    if (isBlinking) {
      // Blink animation: close then open
      const eyeHeight = blinkProgress < 0.5
        ? 8 * (1 - blinkProgress * 2)
        : 8 * ((blinkProgress - 0.5) * 2);

      return (
        <>
          <ellipse cx={50 - 12} cy={baseY} rx={6} ry={eyeHeight / 2} fill="#2C1810" />
          <ellipse cx={50 + 12} cy={baseY} rx={6} ry={eyeHeight / 2} fill="#2C1810" />
        </>
      );
    }

    // Expression-based eyes
    if (expression === 'happy') {
      // Happy eyes: ^ ^ with sparkle
      const intensity = expressionIntensity;
      return (
        <>
          <path
            d={`M ${50 - 18} ${baseY + 3} Q ${50 - 12} ${baseY - 3 * intensity} ${50 - 6} ${baseY + 3}`}
            stroke="#2C1810"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M ${50 + 6} ${baseY + 3} Q ${50 + 12} ${baseY - 3 * intensity} ${50 + 18} ${baseY + 3}`}
            stroke="#2C1810"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          {/* Eye sparkles */}
          <circle cx={50 - 10} cy={baseY - 2} r={1.5} fill="#4A90E2" opacity={intensity} />
          <circle cx={50 + 14} cy={baseY - 2} r={1.5} fill="#4A90E2" opacity={intensity} />
        </>
      );
    }

    if (expression === 'sad') {
      // Sad eyes: droopy with whites visible
      const intensity = expressionIntensity;
      return (
        <>
          {/* Eye whites */}
          <ellipse cx={50 - 12} cy={baseY + intensity * 2} rx={7} ry={8} fill="white" />
          <ellipse cx={50 + 12} cy={baseY + intensity * 2} rx={7} ry={8} fill="white" />
          {/* Pupils */}
          <ellipse cx={50 - 12} cy={baseY + intensity * 2 + 2} rx={5} ry={6} fill="#2C1810" />
          <ellipse cx={50 + 12} cy={baseY + intensity * 2 + 2} rx={5} ry={6} fill="#2C1810" />
          {/* Tear drop */}
          <ellipse cx={50 - 12} cy={baseY + 12} rx={2} ry={3} fill="#4A90E2" opacity={intensity * 0.7} />
        </>
      );
    }

    if (expression === 'frustrated') {
      // Intense stare
      return (
        <>
          {/* Eye whites */}
          <circle cx={50 - 12} cy={baseY} r={7} fill="white" />
          <circle cx={50 + 12} cy={baseY} r={7} fill="white" />
          {/* Larger pupils for intensity */}
          <circle cx={50 - 12} cy={baseY} r={5} fill="#2C1810" />
          <circle cx={50 + 12} cy={baseY} r={5} fill="#2C1810" />
          {/* Highlights */}
          <circle cx={50 - 10} cy={baseY - 2} r={2} fill="white" />
          <circle cx={50 + 14} cy={baseY - 2} r={2} fill="white" />
        </>
      );
    }

    if (expression === 'angry') {
      // Closed/squinting eyes — slightly drooped upper lid
      const intensity = expressionIntensity;
      return (
        <>
          {/* Left eye: thin squint */}
          <path
            d={`M ${50 - 18} ${baseY} Q ${50 - 12} ${baseY + 3 * intensity} ${50 - 6} ${baseY}`}
            stroke="#2C1810"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          {/* Right eye: thin squint */}
          <path
            d={`M ${50 + 6} ${baseY} Q ${50 + 12} ${baseY + 3 * intensity} ${50 + 18} ${baseY}`}
            stroke="#2C1810"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    }

    if (expression === 'eye_roll') {
      // Eyes looking up — pupils shifted upward
      const intensity = expressionIntensity;
      const pupilShift = -4 * intensity; // pupils move up
      return (
        <>
          {/* Left eye white */}
          <circle cx={50 - 12} cy={baseY} r={7} fill="white" />
          {/* Right eye white */}
          <circle cx={50 + 12} cy={baseY} r={7} fill="white" />
          {/* Left pupil — shifted up */}
          <circle cx={50 - 12} cy={baseY + pupilShift} r={4.5} fill="#2C1810" />
          {/* Right pupil — shifted up */}
          <circle cx={50 + 12} cy={baseY + pupilShift} r={4.5} fill="#2C1810" />
          {/* Highlights */}
          <circle cx={50 - 10} cy={baseY + pupilShift - 1.5} r={1.5} fill="white" />
          <circle cx={50 + 14} cy={baseY + pupilShift - 1.5} r={1.5} fill="white" />
        </>
      );
    }

    if (expression === 'talking') {
      // Bright, engaged eyes — slightly squinted happy look
      return (
        <>
          {/* Eye whites */}
          <circle cx={50 - 12} cy={baseY} r={7} fill="white" />
          <circle cx={50 + 12} cy={baseY} r={7} fill="white" />
          {/* Pupils */}
          <circle cx={50 - 12} cy={baseY} r={5} fill="#2C1810" />
          <circle cx={50 + 12} cy={baseY} r={5} fill="#2C1810" />
          {/* Highlights */}
          <circle cx={50 - 10} cy={baseY - 2} r={1.5} fill="white" />
          <circle cx={50 + 14} cy={baseY - 2} r={1.5} fill="white" />
          {/* Sparkles */}
          <circle cx={50 - 10} cy={baseY - 3} r={1} fill="#4A90E2" opacity={0.8} />
          <circle cx={50 + 14} cy={baseY - 3} r={1} fill="#4A90E2" opacity={0.8} />
        </>
      );
    }

    // Normal eyes (idle) with whites and highlights
    if (traits.gender === 'female') {
      // Horizontal oval eyes for women
      return (
        <>
          {/* Eye whites - horizontal oval */}
          <ellipse cx={50 - 12} cy={baseY} rx={8} ry={6} fill="white" />
          <ellipse cx={50 + 12} cy={baseY} rx={8} ry={6} fill="white" />
          {/* Pupils - horizontal oval */}
          <ellipse cx={50 - 12} cy={baseY} rx={6} ry={4.5} fill="#2C1810" />
          <ellipse cx={50 + 12} cy={baseY} rx={6} ry={4.5} fill="#2C1810" />
          {/* Highlights */}
          <ellipse cx={50 - 9} cy={baseY - 1.5} rx={2} ry={1.5} fill="white" />
          <ellipse cx={50 + 15} cy={baseY - 1.5} rx={2} ry={1.5} fill="white" />
        </>
      );
    }

    // Round eyes for men and neutral
    return (
      <>
        {/* Eye whites */}
        <circle cx={50 - 12} cy={baseY} r={7} fill="white" />
        <circle cx={50 + 12} cy={baseY} r={7} fill="white" />
        {/* Pupils */}
        <circle cx={50 - 12} cy={baseY} r={5} fill="#2C1810" />
        <circle cx={50 + 12} cy={baseY} r={5} fill="#2C1810" />
        {/* Highlights */}
        <circle cx={50 - 10} cy={baseY - 2} r={1.5} fill="white" />
        <circle cx={50 + 14} cy={baseY - 2} r={1.5} fill="white" />
      </>
    );
  };

  // Mouth rendering based on expression
  const renderMouth = () => {
    const baseY = 40 + 12;

    if (expression === 'happy') {
      // Big smile
      const intensity = expressionIntensity;
      return (
        <path
          d={`M ${50 - 15} ${baseY} Q ${50} ${baseY + 10 * intensity} ${50 + 15} ${baseY}`}
          stroke="#2C1810"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      );
    }

    if (expression === 'sad') {
      // Frown
      const intensity = expressionIntensity;
      return (
        <path
          d={`M ${50 - 15} ${baseY + 5} Q ${50} ${baseY + 5 - 8 * intensity} ${50 + 15} ${baseY + 5}`}
          stroke="#2C1810"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      );
    }

    if (expression === 'frustrated') {
      // Grimace / gritted teeth
      return (
        <g>
          <rect x={50 - 12} y={baseY + 2} width={24} height={6} fill="#2C1810" rx={1} />
          <line x1={50 - 8} y1={baseY + 2} x2={50 - 8} y2={baseY + 8} stroke="white" strokeWidth="1" />
          <line x1={50 - 4} y1={baseY + 2} x2={50 - 4} y2={baseY + 8} stroke="white" strokeWidth="1" />
          <line x1={50} y1={baseY + 2} x2={50} y2={baseY + 8} stroke="white" strokeWidth="1" />
          <line x1={50 + 4} y1={baseY + 2} x2={50 + 4} y2={baseY + 8} stroke="white" strokeWidth="1" />
          <line x1={50 + 8} y1={baseY + 2} x2={50 + 8} y2={baseY + 8} stroke="white" strokeWidth="1" />
        </g>
      );
    }

    if (expression === 'angry') {
      // Tight-lipped flat line — subtle displeasure
      const intensity = expressionIntensity;
      return (
        <path
          d={`M ${50 - 12} ${baseY + 3} Q ${50} ${baseY + 3 + 1 * intensity} ${50 + 12} ${baseY + 3}`}
          stroke="#2C1810"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
      );
    }

    if (expression === 'eye_roll') {
      // Pursed frown — lips pressed together, corners slightly down
      const intensity = expressionIntensity;
      return (
        <path
          d={`M ${50 - 10} ${baseY + 2} Q ${50} ${baseY + 2 - 3 * intensity} ${50 + 10} ${baseY + 2}`}
          stroke="#2C1810"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      );
    }

    if (expression === 'talking') {
      // Animated talking mouth: sine-wave driven open/close
      // ~6 frames per syllable ≈ natural speech cadence at 30fps
      const openAmount = Math.abs(Math.sin(currentFrame * Math.PI / 6)) * expressionIntensity;
      const mouthOpenY = openAmount * 5; // max 5px opening
      return (
        <g>
          {/* Upper lip */}
          <path
            d={`M ${50 - 10} ${baseY + 2} Q ${50} ${baseY} ${50 + 10} ${baseY + 2}`}
            stroke="#2C1810"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          {/* Lower lip / jaw drop */}
          <path
            d={`M ${50 - 10} ${baseY + 2} Q ${50} ${baseY + 2 + mouthOpenY * 2} ${50 + 10} ${baseY + 2}`}
            stroke="#2C1810"
            strokeWidth="2"
            fill={mouthOpenY > 1 ? '#8B4560' : 'none'}
            strokeLinecap="round"
          />
        </g>
      );
    }

    // Neutral smile
    return (
      <path
        d={`M ${50 - 12} ${baseY + 2} Q ${50} ${baseY + 4} ${50 + 12} ${baseY + 2}`}
        stroke="#2C1810"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
    );
  };

  // Blush/cheeks for expressions
  const renderBlush = () => {
    if (expression === 'happy' && expressionIntensity > 0.3) {
      return (
        <>
          <ellipse cx={50 - 22} cy={40 + 5} rx={6} ry={4} fill="#FF9EC5" opacity={expressionIntensity * 0.5} />
          <ellipse cx={50 + 22} cy={40 + 5} rx={6} ry={4} fill="#FF9EC5" opacity={expressionIntensity * 0.5} />
        </>
      );
    }
    if (expression === 'frustrated' && expressionIntensity > 0.5) {
      return (
        <>
          <ellipse cx={50 - 22} cy={40 + 5} rx={6} ry={4} fill="#E74C3C" opacity={expressionIntensity * 0.4} />
          <ellipse cx={50 + 22} cy={40 + 5} rx={6} ry={4} fill="#E74C3C" opacity={expressionIntensity * 0.4} />
        </>
      );
    }
    if (expression === 'angry' && expressionIntensity > 0.3) {
      return (
        <>
          <ellipse cx={50 - 22} cy={40 + 5} rx={7} ry={5} fill="#D32F2F" opacity={expressionIntensity * 0.6} />
          <ellipse cx={50 + 22} cy={40 + 5} rx={7} ry={5} fill="#D32F2F" opacity={expressionIntensity * 0.6} />
        </>
      );
    }
    return null;
  };

  // Face tint overlay for angry expression
  const renderFaceTint = () => {
    if (expression === 'angry' && expressionIntensity > 0.3) {
      return (
        <ellipse
          cx={50}
          cy={40}
          rx={dimensions.width / 2}
          ry={dimensions.height / 2}
          fill="#FF6B6B"
          opacity={expressionIntensity * 0.3}
        />
      );
    }
    return null;
  };

  // Nose rendering - simple curve
  const renderNose = () => {
    const noseY = 40 + 2;
    return (
      <path
        d={`M ${50 - 3} ${noseY} Q ${50} ${noseY + 6} ${50 + 3} ${noseY}`}
        stroke={skinColor}
        strokeWidth="2.5"
        fill="none"
        filter="brightness(0.85)"
      />
    );
  };

  // Glasses rendering
  const renderGlasses = () => {
    if (!traits.glasses) return null;

    const frameY = 40 - 8;
    return (
      <g>
        {/* Left lens */}
        <circle cx={50 - 12} cy={frameY} r={9} fill="none" stroke="#2C1810" strokeWidth="2" />
        {/* Right lens */}
        <circle cx={50 + 12} cy={frameY} r={9} fill="none" stroke="#2C1810" strokeWidth="2" />
        {/* Bridge */}
        <line x1={50 - 3} y1={frameY} x2={50 + 3} y2={frameY} stroke="#2C1810" strokeWidth="2" />
        {/* Temples */}
        <line x1={50 - 21} y1={frameY} x2={50 - 28} y2={frameY - 2} stroke="#2C1810" strokeWidth="2" />
        <line x1={50 + 21} y1={frameY} x2={50 + 28} y2={frameY - 2} stroke="#2C1810" strokeWidth="2" />
      </g>
    );
  };

  // Beard rendering - integrated with face
  const renderBeard = () => {
    if (!traits.beard) return null;

    const beardColor = '#4A3428';
    const faceBottom = 40 + dimensions.height / 2;
    const faceWidth = dimensions.width / 2;

    return (
      <g>
        {/* Beard area - follows lower face contour */}
        <path
          d={`
            M ${50 - faceWidth * 0.8} ${40 + 8}
            Q ${50 - faceWidth} ${40 + 15} ${50 - faceWidth * 0.7} ${faceBottom - 5}
            Q ${50} ${faceBottom + 2} ${50 + faceWidth * 0.7} ${faceBottom - 5}
            Q ${50 + faceWidth} ${40 + 15} ${50 + faceWidth * 0.8} ${40 + 8}
            Q ${50} ${40 + 18} ${50 - faceWidth * 0.8} ${40 + 8}
          `}
          fill={beardColor}
          opacity={0.85}
        />

        {/* Stubble texture */}
        <g opacity={0.3}>
          <circle cx={50 - 8} cy={40 + 12} r={0.5} fill={beardColor} />
          <circle cx={50 - 12} cy={40 + 14} r={0.5} fill={beardColor} />
          <circle cx={50 - 6} cy={40 + 15} r={0.5} fill={beardColor} />
          <circle cx={50 - 10} cy={40 + 18} r={0.5} fill={beardColor} />
          <circle cx={50 - 4} cy={40 + 17} r={0.5} fill={beardColor} />

          <circle cx={50 + 8} cy={40 + 12} r={0.5} fill={beardColor} />
          <circle cx={50 + 12} cy={40 + 14} r={0.5} fill={beardColor} />
          <circle cx={50 + 6} cy={40 + 15} r={0.5} fill={beardColor} />
          <circle cx={50 + 10} cy={40 + 18} r={0.5} fill={beardColor} />
          <circle cx={50 + 4} cy={40 + 17} r={0.5} fill={beardColor} />

          <circle cx={50 - 2} cy={40 + 19} r={0.5} fill={beardColor} />
          <circle cx={50 + 2} cy={40 + 19} r={0.5} fill={beardColor} />
          <circle cx={50} cy={40 + 21} r={0.5} fill={beardColor} />
          <circle cx={50 - 5} cy={40 + 20} r={0.5} fill={beardColor} />
          <circle cx={50 + 5} cy={40 + 20} r={0.5} fill={beardColor} />
        </g>

        {/* Mustache - continuous across upper lip */}
        <path
          d={`
            M ${50 - 15} ${40 + 9}
            Q ${50 - 10} ${40 + 7} ${50 - 5} ${40 + 9}
            Q ${50} ${40 + 10} ${50 + 5} ${40 + 9}
            Q ${50 + 10} ${40 + 7} ${50 + 15} ${40 + 9}
            Q ${50 + 10} ${40 + 11} ${50 + 5} ${40 + 11}
            Q ${50} ${40 + 12} ${50 - 5} ${40 + 11}
            Q ${50 - 10} ${40 + 11} ${50 - 15} ${40 + 9}
          `}
          fill={beardColor}
          opacity={0.9}
        />
      </g>
    );
  };

  // Hat rendering
  const renderHat = () => {
    if (traits.hat.type === 'none') return null;

    const hatColor = traits.hat.color;

    switch (traits.hat.type) {
      case 'cap':
        return (
          <g>
            {/* Bill */}
            <ellipse cx={50} cy={40 - 28} rx={25} ry={8} fill={hatColor} />
            {/* Crown */}
            <ellipse cx={50} cy={40 - 32} rx={22} ry={12} fill={hatColor} />
          </g>
        );

      case 'beanie':
        return (
          <ellipse cx={50} cy={40 - 32} rx={26} ry={15} fill={hatColor} />
        );

      case 'cowboy':
        return (
          <g>
            {/* Brim */}
            <ellipse cx={50} cy={40 - 28} rx={32} ry={8} fill={hatColor} />
            {/* Crown */}
            <ellipse cx={50} cy={40 - 35} rx={20} ry={12} fill={hatColor} />
          </g>
        );

      case 'fedora':
        return (
          <g>
            {/* Brim */}
            <ellipse cx={50} cy={40 - 28} rx={28} ry={7} fill={hatColor} />
            {/* Crown */}
            <rect x={50 - 18} y={40 - 42} width={36} height={14} rx={3} fill={hatColor} />
            {/* Band */}
            <rect x={50 - 18} y={40 - 30} width={36} height={3} fill="#2C1810" />
          </g>
        );

      default:
        return null;
    }
  };

  // Steam particles for frustrated expression
  const renderSteam = () => {
    if (expression !== 'frustrated' || expressionIntensity < 0.5) return null;

    const steamFrame = currentFrame % 30;
    const opacity = 1 - (steamFrame / 30);

    return (
      <g opacity={opacity}>
        <circle cx={50 - 25} cy={40 - 20 - steamFrame} r={3} fill="#888" />
        <circle cx={50 + 25} cy={40 - 20 - steamFrame} r={3} fill="#888" />
      </g>
    );
  };

  // Shirt/collar at bottom of frame
  const renderShirt = () => {
    const neckY = 40 + dimensions.height / 2;
    const shirtColor = traits.shirtColor;

    return (
      <g>
        {/* Neck */}
        <rect
          x={50 - 6}
          y={neckY - 2}
          width={12}
          height={10}
          fill={skinColor}
        />

        {/* Shirt body */}
        <path
          d={`M 10 ${neckY + 10} L ${50 - 16} ${neckY + 8} L ${50 - 6} ${neckY + 10} L ${50 - 6} 100 L 10 100 Z`}
          fill={shirtColor}
        />
        <path
          d={`M 90 ${neckY + 10} L ${50 + 16} ${neckY + 8} L ${50 + 6} ${neckY + 10} L ${50 + 6} 100 L 90 100 Z`}
          fill={shirtColor}
        />

        {/* Collar */}
        <path
          d={`M ${50 - 6} ${neckY + 10} L ${50 - 10} ${neckY + 5} L ${50 - 4} ${neckY + 16}`}
          fill={shirtColor}
          stroke={shirtColor}
          strokeWidth="1"
        />
        <path
          d={`M ${50 + 6} ${neckY + 10} L ${50 + 10} ${neckY + 5} L ${50 + 4} ${neckY + 16}`}
          fill={shirtColor}
          stroke={shirtColor}
          strokeWidth="1"
        />

        {/* Collar shadow/detail */}
        <path
          d={`M ${50 - 6} ${neckY + 10} L ${50} ${neckY + 13} L ${50 + 6} ${neckY + 10}`}
          fill="rgba(0, 0, 0, 0.1)"
        />
      </g>
    );
  };

  // Hair rendering (only if no hat)
  const renderHair = () => {
    if (traits.hat.type !== 'none') return null;

    const hairColor = traits.hair.color;
    const hairType = traits.hair.type;

    if (hairType === 'bald') return null;

    const headTop = 40 - dimensions.height / 2;
    const headWidth = dimensions.width / 2;

    switch (hairType) {
      case 'short':
        // Short cropped hair - covers more of the head
        return (
          <g>
            {/* Main hair mass */}
            <ellipse
              cx={50}
              cy={headTop + 6}
              rx={headWidth + 3}
              ry={12}
              fill={hairColor}
            />
            {/* Hair extends down sides */}
            <path
              d={`
                M ${50 - headWidth - 3} ${headTop + 10}
                Q ${50 - headWidth - 2} ${headTop + 14} ${50 - headWidth} ${headTop + 16}
                L ${50 - headWidth + 2} ${headTop + 15}
                Q ${50 - headWidth + 1} ${headTop + 12} ${50 - headWidth + 1} ${headTop + 10}
                Z
              `}
              fill={hairColor}
            />
            <path
              d={`
                M ${50 + headWidth + 3} ${headTop + 10}
                Q ${50 + headWidth + 2} ${headTop + 14} ${50 + headWidth} ${headTop + 16}
                L ${50 + headWidth - 2} ${headTop + 15}
                Q ${50 + headWidth - 1} ${headTop + 12} ${50 + headWidth - 1} ${headTop + 10}
                Z
              `}
              fill={hairColor}
            />
          </g>
        );

      case 'long':
        // Long flowing hair - continuous shape
        return (
          <g>
            {/* Hair top/crown */}
            <ellipse
              cx={50}
              cy={headTop + 4}
              rx={headWidth + 4}
              ry={12}
              fill={hairColor}
            />
            {/* Continuous flowing hair sides - longer and smoother */}
            <path
              d={`
                M ${50 - headWidth - 4} ${headTop + 10}
                Q ${50 - headWidth - 7} ${40 + 5} ${50 - headWidth - 6} ${40 + 20}
                Q ${50 - headWidth - 5} ${40 + 30} ${50 - headWidth - 3} ${40 + 35}
                L ${50 - headWidth + 1} ${40 + 34}
                Q ${50 - headWidth + 1} ${40 + 28} ${50 - headWidth + 1} ${40 + 18}
                Q ${50 - headWidth} ${40 + 5} ${50 - headWidth + 2} ${headTop + 10}
                Z
              `}
              fill={hairColor}
            />
            <path
              d={`
                M ${50 + headWidth + 4} ${headTop + 10}
                Q ${50 + headWidth + 7} ${40 + 5} ${50 + headWidth + 6} ${40 + 20}
                Q ${50 + headWidth + 5} ${40 + 30} ${50 + headWidth + 3} ${40 + 35}
                L ${50 + headWidth - 1} ${40 + 34}
                Q ${50 + headWidth - 1} ${40 + 28} ${50 + headWidth - 1} ${40 + 18}
                Q ${50 + headWidth} ${40 + 5} ${50 + headWidth - 2} ${headTop + 10}
                Z
              `}
              fill={hairColor}
            />
            {/* Hair detail strands - longer */}
            <path
              d={`M ${50 - headWidth - 3.5} ${headTop + 14} Q ${50 - headWidth - 5} ${40 + 15} ${50 - headWidth - 4} ${40 + 32}`}
              stroke={hairColor}
              strokeWidth="1.5"
              fill="none"
              opacity="0.5"
            />
            <path
              d={`M ${50 + headWidth + 3.5} ${headTop + 14} Q ${50 + headWidth + 5} ${40 + 15} ${50 + headWidth + 4} ${40 + 32}`}
              stroke={hairColor}
              strokeWidth="1.5"
              fill="none"
              opacity="0.5"
            />
          </g>
        );

      case 'curly':
        // Curly/afro hair
        return (
          <g>
            <ellipse
              cx={50}
              cy={headTop + 2}
              rx={headWidth + 5}
              ry={12}
              fill={hairColor}
            />
            {/* Curl bumps */}
            <circle cx={50 - headWidth} cy={headTop + 3} r={4} fill={hairColor} />
            <circle cx={50 - headWidth / 2} cy={headTop} r={4} fill={hairColor} />
            <circle cx={50 + headWidth / 2} cy={headTop} r={4} fill={hairColor} />
            <circle cx={50 + headWidth} cy={headTop + 3} r={4} fill={hairColor} />
          </g>
        );

      case 'wavy':
        // Wavy/medium length
        return (
          <g>
            {/* Top */}
            <ellipse
              cx={50}
              cy={headTop + 4}
              rx={headWidth + 3}
              ry={9}
              fill={hairColor}
            />
            {/* Waves */}
            <path
              d={`M ${50 - headWidth - 3} ${headTop + 10} Q ${50 - headWidth - 5} ${40} ${50 - headWidth - 2} ${40 + 8}`}
              fill={hairColor}
            />
            <path
              d={`M ${50 + headWidth + 3} ${headTop + 10} Q ${50 + headWidth + 5} ${40} ${50 + headWidth + 2} ${40 + 8}`}
              fill={hairColor}
            />
          </g>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        width: '300px',
        height: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `translateY(${bobOffset}px)`,
        transition: 'transform 0.1s linear',
      }}
    >
      <svg width="300" height="300" viewBox="0 0 100 100">
        <g transform="translate(50, 50) scale(0.8) translate(-50, -50)">
          {/* Shirt (behind everything) */}
          {renderShirt()}

          {/* Shadow */}
          <ellipse
            cx={50}
            cy={85}
            rx={dimensions.width * 0.8}
            ry={6}
            fill="rgba(0, 0, 0, 0.15)"
          />

          {/* Hair (behind face) */}
          {renderHair()}

          {/* Face shape */}
          <ellipse
            cx={50}
            cy={40}
            rx={dimensions.width / 2}
            ry={dimensions.height / 2}
            fill={skinColor}
          />

          {/* Face tint for angry */}
          {renderFaceTint()}

          {/* Hat (over hair) */}
          {renderHat()}

          {/* Blush/cheeks */}
          {renderBlush()}

          {/* Eyebrows */}
          {renderEyebrows()}

          {/* Eyes */}
          {renderEyes()}

          {/* Nose */}
          {renderNose()}

          {/* Glasses */}
          {renderGlasses()}

          {/* Beard (before mouth so mouth is on top) */}
          {renderBeard()}

          {/* Mouth */}
          {renderMouth()}

          {/* Steam particles */}
          {renderSteam()}
        </g>
      </svg>
    </div>
  );
};
