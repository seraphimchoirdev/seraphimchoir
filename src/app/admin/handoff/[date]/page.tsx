'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  FileCode,
  FileText,
  GitBranch,
  GitCommit,
  Lightbulb,
  ListTodo,
  Loader2,
  Target,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

// 섹션 아이콘 매핑
const sectionIcons: Record<string, React.ReactNode> = {
  'Current State Summary': <Target className="h-5 w-5" />,
  'Important Context': <Lightbulb className="h-5 w-5" />,
  'Completed Work': <CheckCircle2 className="h-5 w-5" />,
  'Immediate Next Steps': <ListTodo className="h-5 w-5" />,
  'Decisions Made': <GitBranch className="h-5 w-5" />,
  'Blockers & Open Questions': <AlertCircle className="h-5 w-5" />,
  'Critical Files & Locations': <FileCode className="h-5 w-5" />,
  'Patterns & Conventions': <Code2 className="h-5 w-5" />,
  'Potential Gotchas': <TriangleAlert className="h-5 w-5" />,
  'Environment State': <GitBranch className="h-5 w-5" />,
  'Testing & Quality': <CheckCircle2 className="h-5 w-5" />,
  'Documentation Updates': <FileText className="h-5 w-5" />,
  'Session Statistics': <Clock className="h-5 w-5" />,
  'Related Commits': <GitCommit className="h-5 w-5" />,
};

// 섹션 색상 매핑
const sectionColors: Record<string, string> = {
  'Current State Summary': 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
  'Important Context': 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
  'Completed Work': 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400',
  'Immediate Next Steps': 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400',
  'Decisions Made': 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400',
  'Blockers & Open Questions': 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400',
  'Critical Files & Locations': 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400',
  'Patterns & Conventions': 'bg-teal-500/10 border-teal-500/30 text-teal-600 dark:text-teal-400',
  'Potential Gotchas': 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400',
  'Environment State': 'bg-slate-500/10 border-slate-500/30 text-slate-600 dark:text-slate-400',
  'Testing & Quality': 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
  'Documentation Updates': 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400',
  'Session Statistics': 'bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400',
  'Related Commits': 'bg-pink-500/10 border-pink-500/30 text-pink-600 dark:text-pink-400',
};

interface Section {
  id: string;
  title: string;
  content: string;
  level: number;
}

interface HandoffMetadata {
  project?: string;
  date?: string;
  from?: string;
  to?: string;
  relatedIssue?: string;
}

// 마크다운 파싱 함수
function parseMarkdown(markdown: string): { metadata: HandoffMetadata; sections: Section[] } {
  const lines = markdown.split('\n');
  const sections: Section[] = [];
  const metadata: HandoffMetadata = {};

  let currentSection: Section | null = null;
  let contentBuffer: string[] = [];
  let inFrontMatter = false;

  for (const line of lines) {
    // 메타데이터 파싱
    if (line.startsWith('**Project**:')) {
      metadata.project = line.replace('**Project**:', '').trim();
      continue;
    }
    if (line.startsWith('**Date**:')) {
      metadata.date = line.replace('**Date**:', '').trim();
      continue;
    }
    if (line.startsWith('**From**:')) {
      metadata.from = line.replace('**From**:', '').trim();
      continue;
    }
    if (line.startsWith('**To**:')) {
      metadata.to = line.replace('**To**:', '').trim();
      continue;
    }
    if (line.startsWith('**Related Ticket/Issue**:')) {
      metadata.relatedIssue = line.replace('**Related Ticket/Issue**:', '').trim();
      continue;
    }

    // 섹션 헤더 감지 (## 레벨)
    const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headerMatch) {
      // 이전 섹션 저장
      if (currentSection) {
        currentSection.content = contentBuffer.join('\n').trim();
        if (currentSection.content || currentSection.title !== 'AI Context Handoff') {
          sections.push(currentSection);
        }
      }

      const level = headerMatch[1].length;
      const title = headerMatch[2]
        .replace(/^\d+\.\s*/, '')
        .replace(/^[\u{1F4CB}\u{1F4A1}\u{2705}\u{1F3AF}\u{1F9E0}\u{26A0}\u{1F4C1}\u{1F527}\u{1F4CA}\u{1F517}]/gu, '')
        .trim();

      currentSection = {
        id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        title,
        content: '',
        level,
      };
      contentBuffer = [];
    } else if (currentSection) {
      contentBuffer.push(line);
    }
  }

  // 마지막 섹션 저장
  if (currentSection) {
    currentSection.content = contentBuffer.join('\n').trim();
    sections.push(currentSection);
  }

  return { metadata, sections };
}

// 마크다운 콘텐츠 렌더링 (간단한 변환)
function renderContent(content: string): React.ReactNode {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let codeLanguage = '';
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeaders: string[] = [];

  const processInlineMarkdown = (text: string): React.ReactNode => {
    // 코드 스팬
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="rounded bg-[var(--color-background-secondary)] px-1.5 py-0.5 font-mono text-sm text-[var(--color-primary)]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      // 볼드
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bp, j) => {
        if (bp.startsWith('**') && bp.endsWith('**')) {
          return (
            <strong key={`${i}-${j}`} className="font-semibold">
              {bp.slice(2, -2)}
            </strong>
          );
        }
        return bp;
      });
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 코드 블록 처리
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${i}`}
            className="my-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100"
          >
            <code className={`language-${codeLanguage}`}>{codeContent.join('\n')}</code>
          </pre>
        );
        codeContent = [];
        inCodeBlock = false;
      } else {
        codeLanguage = line.slice(3).trim() || 'text';
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // 테이블 처리
    if (line.startsWith('|')) {
      const cells = line
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());

      if (line.includes('---')) {
        // 헤더 구분선
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      // 테이블 종료
      elements.push(
        <div key={`table-${i}`} className="my-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {tableHeaders.map((h, hi) => (
                  <th
                    key={hi}
                    className="px-3 py-2 text-left font-semibold text-[var(--color-text-primary)]"
                  >
                    {processInlineMarkdown(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, ri) => (
                <tr key={ri} className="border-b border-[var(--color-border)]/50">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-[var(--color-text-secondary)]">
                      {processInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      inTable = false;
      tableHeaders = [];
      tableRows = [];
    }

    // 빈 줄
    if (!line.trim()) {
      continue;
    }

    // 체크박스 리스트
    if (line.match(/^[-*]\s+\[[ x]\]/)) {
      const checked = line.includes('[x]');
      const text = line.replace(/^[-*]\s+\[[ x]\]\s*/, '');
      elements.push(
        <div key={`check-${i}`} className="flex items-start gap-2 py-1">
          <div
            className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded ${
              checked
                ? 'bg-green-500/20 text-green-600'
                : 'bg-[var(--color-background-secondary)] text-[var(--color-text-tertiary)]'
            }`}
          >
            {checked ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-3 w-3 rounded-sm border" />}
          </div>
          <span
            className={checked ? 'text-[var(--color-text-secondary)] line-through' : 'text-[var(--color-text-primary)]'}
          >
            {processInlineMarkdown(text)}
          </span>
        </div>
      );
      continue;
    }

    // 일반 리스트
    if (line.match(/^[-*]\s+/)) {
      const text = line.replace(/^[-*]\s+/, '');
      elements.push(
        <div key={`list-${i}`} className="flex items-start gap-2 py-1">
          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--color-primary)]" />
          <span className="text-[var(--color-text-secondary)]">{processInlineMarkdown(text)}</span>
        </div>
      );
      continue;
    }

    // 번호 리스트
    if (line.match(/^\d+\.\s+/)) {
      const match = line.match(/^(\d+)\.\s+(.+)$/);
      if (match) {
        elements.push(
          <div key={`num-${i}`} className="flex items-start gap-3 py-1">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-white">
              {match[1]}
            </span>
            <span className="text-[var(--color-text-secondary)]">{processInlineMarkdown(match[2])}</span>
          </div>
        );
      }
      continue;
    }

    // 인용문
    if (line.startsWith('>')) {
      const text = line.replace(/^>\s*/, '');
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="my-2 border-l-4 border-[var(--color-primary)] bg-[var(--color-primary)]/5 py-2 pl-4 italic text-[var(--color-text-secondary)]"
        >
          {processInlineMarkdown(text)}
        </blockquote>
      );
      continue;
    }

    // 일반 텍스트
    elements.push(
      <p key={`p-${i}`} className="py-1 text-[var(--color-text-secondary)]">
        {processInlineMarkdown(line)}
      </p>
    );
  }

  return <div className="space-y-1">{elements}</div>;
}

// 섹션 카드 컴포넌트
function SectionCard({
  section,
  defaultExpanded = true,
}: {
  section: Section;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const icon = sectionIcons[section.title] || <FileText className="h-5 w-5" />;
  const colorClass = sectionColors[section.title] || 'bg-slate-500/10 border-slate-500/30 text-slate-600';

  return (
    <div
      id={section.id}
      className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-shadow hover:shadow-md"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${colorClass}`}>
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{section.title}</h3>
        </div>
        <div className="text-[var(--color-text-tertiary)]">
          {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-background)] p-4">
          {renderContent(section.content)}
        </div>
      )}
    </div>
  );
}

// 목차 컴포넌트
function TableOfContents({ sections }: { sections: Section[] }) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -80% 0px' }
    );

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className="sticky top-24 hidden max-h-[calc(100vh-120px)] overflow-y-auto lg:block">
      <h4 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">목차</h4>
      <ul className="space-y-1 text-sm">
        {sections
          .filter((s) => s.level === 2)
          .map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={`block rounded-md px-3 py-1.5 transition-colors ${
                  activeId === section.id
                    ? 'bg-[var(--color-primary)]/10 font-medium text-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]'
                }`}
              >
                {section.title}
              </a>
            </li>
          ))}
      </ul>
    </nav>
  );
}

export default function HandoffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const date = params.date as string;

  // 핸드오프 목록 조회 (이전/다음 네비게이션용)
  const { data: fileList } = useQuery({
    queryKey: ['handoff', 'list'],
    queryFn: async () => {
      const res = await fetch('/api/admin/handoff');
      if (!res.ok) return [];
      return res.json() as Promise<string[]>;
    },
  });

  // 핸드오프 상세 조회
  const {
    data: content,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['handoff', 'detail', date],
    queryFn: async () => {
      const res = await fetch(`/api/admin/handoff/${date}?raw=true`);
      if (!res.ok) throw new Error('Failed to fetch handoff');
      return res.json() as Promise<{ markdown?: string; html: string; date: string }>;
    },
  });

  // 이전/다음 날짜 계산
  const navigation = useMemo(() => {
    if (!fileList) return { prev: null, next: null };
    const currentIndex = fileList.findIndex((f) => f.replace('.md', '') === date);
    return {
      prev: currentIndex < fileList.length - 1 ? fileList[currentIndex + 1]?.replace('.md', '') : null,
      next: currentIndex > 0 ? fileList[currentIndex - 1]?.replace('.md', '') : null,
    };
  }, [fileList, date]);

  // 마크다운 파싱
  const { metadata, sections } = useMemo(() => {
    if (!content?.markdown && !content?.html) return { metadata: {}, sections: [] };
    // markdown이 있으면 파싱, 없으면 html에서 추출 시도
    const md = content.markdown || '';
    return parseMarkdown(md);
  }, [content]);

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && navigation.prev) {
        router.push(`/admin/handoff/${navigation.prev}`);
      } else if (e.key === 'ArrowRight' && navigation.next) {
        router.push(`/admin/handoff/${navigation.next}`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigation, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg border border-[var(--color-error)] bg-[var(--color-error)]/10 p-4 text-[var(--color-error)]">
          문서를 불러오는데 실패했습니다.
        </div>
      </div>
    );
  }

  // 마크다운이 없으면 기존 HTML 렌더링
  if (!content?.markdown) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Link
          href="/admin/handoff"
          className="mb-6 inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          목록으로
        </Link>

        <article
          className="prose prose-slate max-w-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: content?.html || '' }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* 헤더 */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/admin/handoff"
          className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          목록으로
        </Link>

        <div className="flex items-center gap-2">
          {navigation.prev && (
            <Link
              href={`/admin/handoff/${navigation.prev}`}
              className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-background-secondary)]"
            >
              <ArrowLeft className="h-4 w-4" />
              이전
            </Link>
          )}
          {navigation.next && (
            <Link
              href={`/admin/handoff/${navigation.next}`}
              className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-background-secondary)]"
            >
              다음
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      {/* 메타데이터 카드 */}
      <div className="mb-8 rounded-xl border border-[var(--color-border)] bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              AI Context Handoff
            </h1>
            {metadata.project && (
              <p className="mt-1 text-[var(--color-text-secondary)]">{metadata.project}</p>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-[var(--color-surface)] px-3 py-2">
            <Calendar className="h-4 w-4 text-[var(--color-primary)]" />
            <span className="font-mono text-sm font-medium">{date}</span>
          </div>
        </div>

        {(metadata.from || metadata.to) && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {metadata.from && (
              <div>
                <span className="text-[var(--color-text-tertiary)]">From:</span>{' '}
                <span className="font-medium text-[var(--color-text-primary)]">{metadata.from}</span>
              </div>
            )}
            {metadata.to && (
              <div>
                <span className="text-[var(--color-text-tertiary)]">To:</span>{' '}
                <span className="font-medium text-[var(--color-text-primary)]">{metadata.to}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex gap-8">
        {/* 목차 사이드바 */}
        <aside className="w-56 flex-shrink-0">
          <TableOfContents sections={sections} />
        </aside>

        {/* 섹션 카드 */}
        <main className="flex-1 space-y-4">
          {sections
            .filter((s) => s.level === 2 && s.title !== 'AI Context Handoff')
            .map((section) => (
              <SectionCard key={section.id} section={section} />
            ))}
        </main>
      </div>

      {/* 키보드 단축키 안내 */}
      <div className="mt-8 text-center text-sm text-[var(--color-text-tertiary)]">
        <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-background-secondary)] px-2 py-0.5">
          ←
        </kbd>{' '}
        /{' '}
        <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-background-secondary)] px-2 py-0.5">
          →
        </kbd>{' '}
        키로 이전/다음 문서 이동
      </div>
    </div>
  );
}
