/**
 * 스플래시 화면 관리자
 * AuthProvider가 초기화 완료를 알리면 SplashScreen이 구독하여 반응합니다.
 *
 * 흐름:
 *   AuthProvider: fetchUser() 완료 → splashManager.setAppReady()
 *   SplashScreen: splashManager.onAppReady(callback) 구독 → fade-out 시작
 */

class SplashManager {
  private static instance: SplashManager;
  private isReady = false;
  private readyCallbacks: (() => void)[] = [];
  private splashDismissedCallbacks: (() => void)[] = [];
  private isSplashDismissed = false;

  static getInstance(): SplashManager {
    if (!SplashManager.instance) {
      SplashManager.instance = new SplashManager();
    }
    return SplashManager.instance;
  }

  /**
   * 앱이 준비되었음을 알립니다 (AuthProvider에서 호출).
   */
  setAppReady(): void {
    if (this.isReady) return;
    this.isReady = true;
    this.readyCallbacks.forEach((callback) => callback());
    this.readyCallbacks = [];
  }

  /**
   * 앱 준비 상태를 확인합니다.
   */
  getIsAppReady(): boolean {
    return this.isReady;
  }

  /**
   * 앱이 준비되면 실행할 콜백을 등록합니다 (SplashScreen에서 호출).
   */
  onAppReady(callback: () => void): () => void {
    if (this.isReady) {
      callback();
    } else {
      this.readyCallbacks.push(callback);
    }
    return () => {
      this.readyCallbacks = this.readyCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * 스플래시가 완전히 사라졌음을 알립니다.
   */
  setSplashDismissed(): void {
    if (this.isSplashDismissed) return;
    this.isSplashDismissed = true;
    this.splashDismissedCallbacks.forEach((callback) => callback());
    this.splashDismissedCallbacks = [];
  }

  /**
   * 스플래시 사라짐을 구독합니다.
   */
  onSplashDismissed(callback: () => void): () => void {
    if (this.isSplashDismissed) {
      callback();
    } else {
      this.splashDismissedCallbacks.push(callback);
    }
    return () => {
      this.splashDismissedCallbacks = this.splashDismissedCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * 스플래시 상태를 리셋합니다 (개발 환경용).
   */
  reset(): void {
    this.isReady = false;
    this.isSplashDismissed = false;
    this.readyCallbacks = [];
    this.splashDismissedCallbacks = [];
  }
}

export const splashManager = SplashManager.getInstance();
