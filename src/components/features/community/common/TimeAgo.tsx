'use client';

import { useEffect, useState } from 'react';

const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;
const MONTH = DAY * 30;

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);

  if (diff < MINUTE) return '방금 전';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}분 전`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}시간 전`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}일 전`;
  if (diff < MONTH) return `${Math.floor(diff / WEEK)}주 전`;

  // 오래된 날짜는 날짜 형식으로 표시
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  if (year === new Date().getFullYear()) {
    return `${month}월 ${day}일`;
  }
  return `${year}.${month}.${day}`;
}

interface TimeAgoProps {
  date: string;
  className?: string;
}

export default function TimeAgo({ date, className }: TimeAgoProps) {
  const [text, setText] = useState(() => getTimeAgo(date));

  useEffect(() => {
    setText(getTimeAgo(date));
    // 1분마다 업데이트
    const interval = setInterval(() => setText(getTimeAgo(date)), 60_000);
    return () => clearInterval(interval);
  }, [date]);

  return (
    <time dateTime={date} className={className} title={new Date(date).toLocaleString('ko-KR')}>
      {text}
    </time>
  );
}
