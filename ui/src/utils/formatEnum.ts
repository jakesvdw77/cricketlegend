/**
 * Converts a SCREAMING_SNAKE_CASE enum string to Title Case.
 * e.g. 'RIGHT_HANDED' → 'Right Handed', 'FAST_PACE' → 'Fast Pace'
 */
export const formatEnum = (value: string | undefined | null): string => {
  if (!value) return '';
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};
