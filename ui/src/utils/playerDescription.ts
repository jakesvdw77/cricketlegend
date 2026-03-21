import { Player } from '../types';

const BOWLING_LABELS: Record<string, string> = {
  FAST_PACE: 'Fast',
  MEDIUM_FAST_PACE: 'Medium Fast',
  MEDIUM_PACE: 'Medium',
  OFF_SPIN: 'Off Spin',
  LEG_SPIN: 'Leg Spin',
  SLOW_BOWLER: 'Slow',
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
