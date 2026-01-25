/**
 * 스플래시 화면 관리자
 * 앱 초기화 상태를 추적하고 스플래시 화면 표시를 제어합니다.
 */

class SplashManager {
  private static instance: SplashManager;
  private isAppReady = false;
  private readyCallbacks: (() => void)[] = [];

  static getInstance(): SplashManager {
    if (!SplashManager.instance) {
      SplashManager.instance = new SplashManager();
    }
    return SplashManager.instance;
  }

  /**
   * 앱이 준비되었음을 알립니다.
   */
  setAppReady(): void {
    this.isAppReady = true;
    // 대기 중인 콜백 실행
    this.readyCallbacks.forEach((callback) => callback());
    this.readyCallbacks = [];
  }

  /**
   * 앱 준비 상태를 확인합니다.
   */
  getIsAppReady(): boolean {
    return this.isAppReady;
  }

  /**
   * 앱이 준비되면 실행할 콜백을 등록합니다.
   */
  onAppReady(callback: () => void): void {
    if (this.isAppReady) {
      callback();
    } else {
      this.readyCallbacks.push(callback);
    }
  }

  /**
   * 스플래시 상태를 리셋합니다 (개발 환경용).
   */
  reset(): void {
    this.isAppReady = false;
    this.readyCallbacks = [];
  }
}

export const splashManager = SplashManager.getInstance();
