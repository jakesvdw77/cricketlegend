import { Player } from '../types';

const BOWLING_LABELS: Record<string, string> = {
  VERY_FAST: 'Very Fast',
  FAST: 'Fast',
  FAST_MEDIUM: 'Fast Medium',
  MEDIUM_FAST: 'Medium Fast',
  MEDIUM: 'Medium',
  MEDIUM_SLOW: 'Medium Slow',
  OFF_SPIN: 'Off Spin',
  LEG_SPIN: 'Leg Spin',
  SLOW_LEFT_ARM_ORTHODOX: 'Slow Left-Arm Orthodox',
  CHINAMAN: 'Chinaman',
  NONE: '',
};

const BATTING_LABELS: Record<string, string> = {
  LEFT_HANDED: 'Left Handed Batter',
  RIGHT_HANDED: 'Right Handed Batter',
};

const ARM_LABELS: Record<string, string> = {
  LEFT: 'Left Arm',
  RIGHT: 'Right Arm',
};

export function playerDescription(p: Player): string {
  const batting = p.battingStance ? (BATTING_LABELS[p.battingStance] ?? '') : '';
  const bowlingType = p.bowlingType && p.bowlingType !== 'NONE' ? (BOWLING_LABELS[p.bowlingType] ?? '') : '';
  const arm = p.bowlingArm ? (ARM_LABELS[p.bowlingArm] ?? '') : '';
  const bowling = arm && bowlingType ? `${arm} ${bowlingType}` : bowlingType || arm;
  const wk = p.wicketKeeper ? '🧤 Wicket Keeper' : '';
  return [batting, bowling, wk].filter(Boolean).join(' · ');
}
