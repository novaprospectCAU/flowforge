/**
 * 요청 큐 (Rate Limiting)
 * 동시 요청 수를 제한하여 API rate limit 방지
 */

export class RequestQueue {
  private running = 0;
  private queue: Array<{ resolve: () => void }> = [];

  constructor(private maxConcurrent: number = 3) {}

  /**
   * 슬롯 획득 (동시 실행 수 제한)
   * maxConcurrent에 도달하면 슬롯이 해제될 때까지 대기
   */
  async acquire(): Promise<void> {
    if (this.running < this.maxConcurrent) {
      this.running++;
      return;
    }

    return new Promise<void>((resolve) => {
      this.queue.push({ resolve });
    });
  }

  /**
   * 슬롯 해제 (다음 대기 요청 활성화)
   */
  release(): void {
    const next = this.queue.shift();
    if (next) {
      next.resolve();
    } else {
      this.running--;
    }
  }

  /**
   * 현재 실행 중인 요청 수
   */
  get activeCount(): number {
    return this.running;
  }

  /**
   * 대기 중인 요청 수
   */
  get pendingCount(): number {
    return this.queue.length;
  }
}
