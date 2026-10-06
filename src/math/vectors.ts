import type { Position } from "../core/types";


export function vectorAdd(p1: Position, p2: Position): Position {
    return [p1[0] + p2[0], p1[1] + p2[1]];
}

export function vectorSubtract(p1: Position, p2: Position): Position {
    return [p1[0] - p2[0], p1[1] - p2[1]];
}

export function vectorScale(p: Position, scalar: number): Position {
    return [p[0] * scalar, p[1] * scalar];
}

export function vectorDot(p1: Position, p2: Position): number {
    return p1[0] * p2[0] + p1[1] * p2[1];
}

export function vectorCross(p1: Position, p2: Position): number {
    return p1[0] * p2[1] - p1[1] * p2[0];
}

export function vectorLength(p: Position): number {
    return Math.sqrt(p[0] * p[0] + p[1] * p[1]);
}

export function triangleArea(p1: Position, p2: Position, p3: Position): number {
    const v1 = vectorSubtract(p2, p1);
    const v2 = vectorSubtract(p3, p1);
    return Math.abs(vectorCross(v1, v2)) / 2;
} // Shoelace formula
