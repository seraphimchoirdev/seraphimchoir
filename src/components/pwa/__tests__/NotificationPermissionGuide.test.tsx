import { fireEvent, render, screen } from '@testing-library/react';

import NotificationPermissionGuide from '@/components/pwa/NotificationPermissionGuide';

// 플랫폼 감지 모킹 (테스트별로 반환값 교체)
const mockUsePWA = jest.fn();
jest.mock('@/hooks/usePWA', () => ({
  usePWA: () => mockUsePWA(),
}));

const basePWA = {
  isIOS: false,
  isAndroid: false,
  isStandalone: false,
};

describe('NotificationPermissionGuide', () => {
  beforeEach(() => {
    mockUsePWA.mockReturnValue(basePWA);
  });

  it('open=false면 아무것도 렌더링하지 않는다', () => {
    const { container } = render(
      <NotificationPermissionGuide open={false} onClose={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('데스크톱: 자물쇠 아이콘 → 알림 허용 → 새로고침 단계를 안내한다', () => {
    render(<NotificationPermissionGuide open onClose={jest.fn()} />);

    expect(screen.getByText('알림 다시 허용하기')).toBeInTheDocument();
    expect(screen.getByText(/자물쇠\(또는 설정\) 아이콘을 클릭/)).toBeInTheDocument();
    expect(screen.getByText(/"허용"으로 바꾸세요/)).toBeInTheDocument();
    expect(screen.getByText(/이 페이지를 새로고침하세요/)).toBeInTheDocument();
  });

  it('iOS PWA(설치됨): iPhone 설정 앱 경로를 안내한다', () => {
    mockUsePWA.mockReturnValue({ ...basePWA, isIOS: true, isStandalone: true });
    render(<NotificationPermissionGuide open onClose={jest.fn()} />);

    expect(screen.getByText(/iPhone "설정" 앱을 여세요/)).toBeInTheDocument();
    expect(screen.getByText(/설정 → 알림 → 새로핌:On/)).toBeInTheDocument();
  });

  it('Android PWA(설치됨): 휴대폰 설정 앱 경로를 안내한다', () => {
    mockUsePWA.mockReturnValue({ ...basePWA, isAndroid: true, isStandalone: true });
    render(<NotificationPermissionGuide open onClose={jest.fn()} />);

    expect(screen.getByText(/휴대폰 "설정" 앱을 여세요/)).toBeInTheDocument();
    expect(screen.getByText(/앱 목록에서 "새로핌:On"을 선택하세요/)).toBeInTheDocument();
  });

  it('iOS 미설치: 설치 안내로 연결한다', () => {
    mockUsePWA.mockReturnValue({ ...basePWA, isIOS: true, isStandalone: false });
    const onClose = jest.fn();
    const onOpenInstallGuide = jest.fn();
    render(
      <NotificationPermissionGuide
        open
        onClose={onClose}
        onOpenInstallGuide={onOpenInstallGuide}
      />
    );

    expect(screen.getByText(/홈 화면에 설치된 앱에서만 푸시 알림/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '설치 방법 보기' }));
    expect(onClose).toHaveBeenCalled();
    expect(onOpenInstallGuide).toHaveBeenCalled();
  });

  it('닫기 버튼이 onClose를 호출한다', () => {
    const onClose = jest.fn();
    render(<NotificationPermissionGuide open onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalled();
  });
});
