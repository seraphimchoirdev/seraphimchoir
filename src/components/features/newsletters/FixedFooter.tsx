'use client';

import { useState } from 'react';

import { Copy, X } from 'lucide-react';

import { showSuccess } from '@/lib/toast';

const ACCOUNT_REGEX = /(\d{6}-\d{2}-\d+)/;

function extractAccountNumber(line: string): string | null {
  const match = line.match(ACCOUNT_REGEX);
  return match ? match[1] : null;
}

/** 하이픈 제거한 순수 숫자 계좌번호 */
function stripHyphens(account: string): string {
  return account.replace(/-/g, '');
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}

interface FixedFooterProps {
  text: string;
}

export default function FixedFooter({ text }: FixedFooterProps) {
  const lines = text.split('\n').filter(Boolean);
  const [showSheet, setShowSheet] = useState(false);
  const [activeAccount, setActiveAccount] = useState('');

  const handleAccountClick = (account: string) => {
    setActiveAccount(account);
    setShowSheet(true);
  };

  const handleCopy = async () => {
    const plain = stripHyphens(activeAccount);
    await copyToClipboard(plain);
    showSuccess('계좌번호가 복사되었습니다.');
    setShowSheet(false);
  };

  const handleToss = () => {
    const plain = stripHyphens(activeAccount);
    window.location.href = `supertoss://send?bank=KB&accountNo=${plain}&amount=0`;
    setShowSheet(false);
  };

  return (
    <>
      <footer className="border-t-2 border-[var(--color-primary-600)] pt-3">
        <div className="space-y-1 text-xs text-[var(--color-text-tertiary)]">
          {lines.map((line, i) => {
            const account = extractAccountNumber(line);
            if (account) {
              const parts = line.split(account);
              return (
                <p key={i}>
                  {parts[0]}
                  <button
                    type="button"
                    onClick={() => handleAccountClick(account)}
                    className="underline decoration-dotted underline-offset-2 font-medium text-[var(--color-primary-700)] active:opacity-70"
                  >
                    {account}
                  </button>
                  {parts[1]}
                </p>
              );
            }
            return <p key={i}>{line}</p>;
          })}
        </div>
      </footer>

      {/* 바텀시트 오버레이 */}
      {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center print:hidden">
          {/* 백드롭 */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowSheet(false)}
          />
          {/* 시트 */}
          <div className="relative w-full max-w-md animate-in slide-in-from-bottom duration-200 rounded-t-2xl bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)] shadow-xl">
            {/* 핸들 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-[var(--color-border)]" />
            </div>

            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 pb-3">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                계좌번호 {activeAccount}
              </h3>
              <button
                type="button"
                onClick={() => setShowSheet(false)}
                className="rounded-full p-1 hover:bg-[var(--color-background-secondary)]"
              >
                <X className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              </button>
            </div>

            {/* 액션 목록 */}
            <div className="border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={handleCopy}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-sm text-[var(--color-text-primary)] active:bg-[var(--color-background-secondary)]"
              >
                <Copy className="h-5 w-5 text-[var(--color-text-secondary)]" />
                계좌번호 복사
              </button>
              <button
                type="button"
                onClick={handleToss}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-sm text-[var(--color-primary-700)] active:bg-[var(--color-background-secondary)]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                토스로 송금
              </button>
            </div>

            {/* 하단 패딩 */}
            <div className="h-2" />
          </div>
        </div>
      )}
    </>
  );
}
