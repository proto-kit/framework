/**
 * Computes the greatest common divisor of a and b
 * @param a
 * @param b
 */
export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  if (b > a) {
    a = b;
    b = a;
  }
  while (a > 0 && b > 0) {
    if (b === 0) {
      return a;
    }
    a %= b;
    if (a === 0) {
      return b;
    }
    b %= a;
  }
  return 1;
}
