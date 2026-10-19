/** Chronomètre d'une partie, avec ses pénalités de temps. */
export class GameClock {
  private startedAt: number | null = null;
  private stoppedAt: number | null = null;
  private penalty = 0;

  start(now = performance.now()) {
    this.startedAt = now;
    this.stoppedAt = null;
    this.penalty = 0;
  }

  stop(now = performance.now()) {
    if (this.startedAt !== null && this.stoppedAt === null) this.stoppedAt = now;
  }

  addPenalty(ms: number) {
    this.penalty += ms;
  }

  /** Temps réellement écoulé, sans les pénalités. */
  elapsed(now = performance.now()): number {
    if (this.startedAt === null) return 0;
    return (this.stoppedAt ?? now) - this.startedAt;
  }

  /** Temps écoulé + pénalités. */
  total(now = performance.now()): number {
    return this.elapsed(now) + this.penalty;
  }
}
