import type { FibonacciValue, TimeValue } from "./types";

/**
 * Fibonacci-like sequence used for story point estimation
 * Modified Fibonacci sequence with higher values for larger estimates
 */
export const FIBONACCI_VALUES: FibonacciValue[] = [0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100];

/**
 * Time estimation values in hours
 * Covers common time ranges from 30 minutes to 5 days (40 hours)
 */
export const TIME_VALUES: TimeValue[] = [0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40];
