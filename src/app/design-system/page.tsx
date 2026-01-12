'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { Calendar } from '@/components/ui/calendar';

// New Refactored Components
import { Typography, Heading, Text } from '@/components/ui/typography';
import { DesignSystemSection } from '@/components/docs/design-system-section';
import { ColorPaletteSection } from '@/components/docs/color-palette';

export default function DesignSystemPage() {
    const [switchChecked, setSwitchChecked] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [buttonGroupValue, setButtonGroupValue] = useState('daily');

    return (
        <div className="min-h-screen bg-[var(--color-background-primary)] p-8 space-y-12 max-w-7xl mx-auto">
            {/* Header */}
            <div className="space-y-4 pb-8 border-b border-[var(--color-border-default)]">
                <Heading level={1}>새로핌찬양대 디자인 시스템</Heading>
                <Text variant="body-large" className="text-[var(--color-text-secondary)]">
                    New Blossom Grace 테마를 기반으로 한 컴포넌트 라이브러리
                </Text>
            </div>

            {/* Typography */}
            <DesignSystemSection title="타이포그래피" description="시스템에서 사용되는 텍스트 스타일입니다.">
                <div className="space-y-8">
                    <div className="grid gap-4">
                        <div className="space-y-1">
                            <Heading level={1}>Heading 1</Heading>
                            <Text variant="caption">heading-1 / 36px / Bold / Tight</Text>
                        </div>
                        <div className="space-y-1">
                            <Heading level={2}>Heading 2</Heading>
                            <Text variant="caption">heading-2 / 30px / Bold / Tight</Text>
                        </div>
                        <div className="space-y-1">
                            <Heading level={3}>Heading 3</Heading>
                            <Text variant="caption">heading-3 / 24px / Semibold / Snug</Text>
                        </div>
                        <div className="space-y-1">
                            <Heading level={4}>Heading 4</Heading>
                            <Text variant="caption">heading-4 / 20px / Semibold / Snug</Text>
                        </div>
                    </div>
                    <div className="grid gap-4">
                        <div className="space-y-1">
                            <Text variant="body-large">Body Large - 찬양하는 마음으로 하나님을 섬기는 새로핌찬양대</Text>
                            <Text variant="caption">body-large / 18px / Normal / Relaxed</Text>
                        </div>
                        <div className="space-y-1">
                            <Text variant="body-base">Body Base - 찬양하는 마음으로 하나님을 섬기는 새로핌찬양대</Text>
                            <Text variant="caption">body-base / 16px / Normal / Normal</Text>
                        </div>
                        <div className="space-y-1">
                            <Text variant="body-small">Body Small - 찬양하는 마음으로 하나님을 섬기는 새로핌찬양대</Text>
                            <Text variant="caption">body-small / 14px / Normal / Normal</Text>
                        </div>
                        <div className="space-y-1">
                            <Text variant="label">Label - 찬양하는 마음으로 하나님을 섬기는 새로핌찬양대</Text>
                            <Text variant="caption">label / 14px / Medium / Normal</Text>
                        </div>
                        <div className="space-y-1">
                            <Text variant="caption">Caption - 찬양하는 마음으로 하나님을 섬기는 새로핌찬양대</Text>
                            <Text variant="caption">caption / 12px / Normal / Normal</Text>
                        </div>
                    </div>
                </div>
            </DesignSystemSection>

            {/* Colors */}
            <DesignSystemSection title="색상 팔레트" description="브랜드 아이덴티티를 반영한 색상 시스템입니다.">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                    <ColorPaletteSection title="Primary (Heavenly Blue)" prefix="color-primary" />
                    <ColorPaletteSection title="Accent (Grace Blossom)" prefix="color-accent" />
                    <ColorPaletteSection title="Success (Hope Green)" prefix="color-success" stops={[50, 100, 200, 300, 400, 500, 600, 700]} />
                    <ColorPaletteSection title="Warning (Cheerful Yellow)" prefix="color-warning" stops={[50, 100, 200, 300, 400, 500, 600]} />
                    <ColorPaletteSection title="Error (Faithful Red)" prefix="color-error" stops={[50, 100, 200, 300, 400, 500, 600, 700]} />
                </div>
            </DesignSystemSection>

            {/* Buttons */}
            <DesignSystemSection title="버튼">
                <div className="space-y-8">
                    <div>
                        <Heading level={4} className="mb-4">기본 Variants</Heading>
                        <div className="flex flex-wrap gap-4">
                            <Button variant="default">Primary Button</Button>
                            <Button variant="secondary">Secondary Button</Button>
                            <Button variant="outline">Outline Button</Button>
                            <Button variant="ghost">Ghost Button</Button>
                            <Button variant="destructive">Destructive Button</Button>
                            <Button variant="link">Link Button</Button>
                        </div>
                    </div>

                    <div>
                        <Heading level={4} className="mb-4">색상 팔레트 Variants (Bold)</Heading>
                        <Text variant="body-small" className="text-[var(--color-text-secondary)] mb-3">
                            디자인 시스템의 주요 색상을 활용한 강조 버튼
                        </Text>
                        <div className="flex flex-wrap gap-4">
                            <Button variant="success">Success</Button>
                            <Button variant="warning">Warning</Button>
                            <Button variant="accent">Accent</Button>
                        </div>
                    </div>

                    <div>
                        <Heading level={4} className="mb-4">색상 팔레트 Variants (Subtle)</Heading>
                        <Text variant="body-small" className="text-[var(--color-text-secondary)] mb-3">
                            부드러운 배경색을 활용한 서브 액션 버튼
                        </Text>
                        <div className="flex flex-wrap gap-4">
                            <Button variant="primarySubtle">Primary Subtle</Button>
                            <Button variant="successSubtle">Success Subtle</Button>
                            <Button variant="warningSubtle">Warning Subtle</Button>
                            <Button variant="errorSubtle">Error Subtle</Button>
                            <Button variant="accentSubtle">Accent Subtle</Button>
                        </div>
                    </div>

                    <div>
                        <Heading level={4} className="mb-4">Sizes</Heading>
                        <div className="flex flex-wrap gap-4 items-center">
                            <Button size="sm">Small</Button>
                            <Button size="default">Default</Button>
                            <Button size="lg">Large</Button>
                        </div>
                    </div>
                </div>
            </DesignSystemSection>

            {/* Button Group */}
            <DesignSystemSection title="버튼 그룹">
                <div className="space-y-8">
                    <div>
                        <Heading level={4} className="mb-4">기본 사용</Heading>
                        <div className="flex flex-col gap-4">
                            <ButtonGroup
                                items={[
                                    { label: '일간', value: 'daily' },
                                    { label: '주간', value: 'weekly' },
                                    { label: '월간', value: 'monthly' },
                                ]}
                                value={buttonGroupValue}
                                onChange={setButtonGroupValue}
                            />
                            <Text variant="body-small" className="text-[var(--color-text-secondary)]">
                                선택된 값: {buttonGroupValue}
                            </Text>
                        </div>
                    </div>
                </div>
            </DesignSystemSection>

            {/* Badges */}
            <DesignSystemSection title="배지">
                <div className="flex flex-wrap gap-3">
                    <Badge variant="success">출석</Badge>
                    <Badge variant="warning">지각</Badge>
                    <Badge variant="error">결석</Badge>
                    <Badge variant="info">보류</Badge>
                    <Badge variant="accent">특송</Badge>
                    <Badge variant="default">기본</Badge>
                </div>
            </DesignSystemSection>

            {/* Form Components */}
            <DesignSystemSection title="폼 컴포넌트">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                    <div className="space-y-2">
                        <Label htmlFor="name">이름</Label>
                        <Input id="name" placeholder="홍길동" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">이메일</Label>
                        <Input id="email" type="email" placeholder="example@church.com" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="switch">토글 스위치</Label>
                        <div className="flex items-center gap-3">
                            <Switch
                                checked={switchChecked}
                                onCheckedChange={setSwitchChecked}
                            />
                            <Text variant="body-small">{switchChecked ? '활성화' : '비활성화'}</Text>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>파트 선택 (Select)</Label>
                        <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="파트를 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="soprano">소프라노</SelectItem>
                                <SelectItem value="alto">알토</SelectItem>
                                <SelectItem value="tenor">테너</SelectItem>
                                <SelectItem value="bass">베이스</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="bio">자기소개 (Textarea)</Label>
                        <Textarea id="bio" placeholder="간단한 자기소개를 입력하세요." />
                    </div>
                </div>
            </DesignSystemSection>

            {/* Switch Variants */}
            <DesignSystemSection title="스위치 (Switch)">
                <div className="space-y-8">
                    <div>
                        <Heading level={4} className="mb-4">Variants</Heading>
                        <div className="flex flex-wrap gap-8">
                            <div className="flex flex-col items-center gap-2">
                                <Switch checked={true} />
                                <Text variant="caption">Default</Text>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Switch checked={true} variant="secondary" />
                                <Text variant="caption">Secondary</Text>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Switch checked={true} variant="accent" />
                                <Text variant="caption">Accent</Text>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Switch checked={true} variant="success" />
                                <Text variant="caption">Success</Text>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Switch checked={true} variant="warning" />
                                <Text variant="caption">Warning</Text>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Switch checked={true} variant="error" />
                                <Text variant="caption">Error</Text>
                            </div>
                        </div>
                    </div>
                </div>
            </DesignSystemSection>

            {/* Cards */}
            <DesignSystemSection title="카드">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>카드 제목</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Text variant="body-base">카드 내용이 여기에 표시됩니다.</Text>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>통계 카드</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <Text variant="body-small">출석률</Text>
                                    <Text variant="label" className="text-[var(--color-success-600)]">95%</Text>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DesignSystemSection>

            {/* Tabs */}
            <DesignSystemSection title="탭">
                <Tabs value="tab1" className="max-w-2xl">
                    <TabsList className="w-full">
                        <TabsTrigger value="tab1" className="flex-1">탭 1</TabsTrigger>
                        <TabsTrigger value="tab2" className="flex-1">탭 2</TabsTrigger>
                    </TabsList>
                    <TabsContent value="tab1" className="mt-4">
                        <Card>
                            <CardContent className="pt-6">
                                <Text variant="body-base">첫 번째 탭의 내용입니다.</Text>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="tab2" className="mt-4">
                        <Card>
                            <CardContent className="pt-6">
                                <Text variant="body-base">두 번째 탭의 내용입니다.</Text>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </DesignSystemSection>

            {/* Feedback Components */}
            <DesignSystemSection title="피드백 컴포넌트">
                <div className="space-y-6">
                    <div className="space-y-4">
                        <Heading level={4}>Alert</Heading>
                        <div className="grid gap-4">
                            <Alert variant="default">
                                <AlertTitle>알림</AlertTitle>
                                <AlertDescription>기본 알림 메시지입니다.</AlertDescription>
                            </Alert>
                            <Alert variant="success">
                                <AlertTitle>성공</AlertTitle>
                                <AlertDescription>작업이 성공적으로 완료되었습니다.</AlertDescription>
                            </Alert>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <Heading level={4}>Spinner</Heading>
                        <div className="flex items-center gap-8">
                            <div className="flex flex-col items-center gap-2">
                                <Spinner size="default" />
                                <Text variant="caption">Default</Text>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Spinner variant="warning" />
                                <Text variant="caption">Warning</Text>
                            </div>
                        </div>
                    </div>
                </div>
            </DesignSystemSection>

            {/* Data Display Components */}
            <DesignSystemSection title="데이터 표시 컴포넌트">
                <div className="space-y-8">
                    <div className="space-y-4">
                        <Heading level={4}>Avatar</Heading>
                        <div className="flex items-center gap-4">
                            <Avatar name="홍길동" size="sm" />
                            <Avatar name="김철수" size="default" />
                            <Avatar name="이영희" size="lg" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <Heading level={4}>Table</Heading>
                        <div className="rounded-lg border border-[var(--color-border-default)] overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>이름</TableHead>
                                        <TableHead>파트</TableHead>
                                        <TableHead>상태</TableHead>
                                        <TableHead className="text-right">출석률</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">홍길동</TableCell>
                                        <TableCell>테너</TableCell>
                                        <TableCell><Badge variant="success">출석</Badge></TableCell>
                                        <TableCell className="text-right">100%</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">김철수</TableCell>
                                        <TableCell>베이스</TableCell>
                                        <TableCell><Badge variant="warning">지각</Badge></TableCell>
                                        <TableCell className="text-right">90%</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </DesignSystemSection>

            {/* Overlay Components */}
            <DesignSystemSection title="오버레이 컴포넌트">
                <div className="flex gap-4">
                    <div className="space-y-2">
                        <Heading level={4} className="mb-4">Dialog</Heading>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline">다이얼로그 열기</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>프로필 수정</DialogTitle>
                                    <DialogDescription>
                                        프로필 정보를 수정하고 저장 버튼을 누르세요.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="dialog-name" className="text-right">
                                            이름
                                        </Label>
                                        <Input id="dialog-name" defaultValue="홍길동" className="col-span-3" />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit">저장</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="space-y-2">
                        <Heading level={4} className="mb-4">Popover & Calendar</Heading>
                        <div className="flex items-center gap-4">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline">날짜 선택</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={(date) => {
                                            if (date instanceof Date) {
                                                setSelectedDate(date);
                                            }
                                        }}
                                    />
                                </PopoverContent>
                            </Popover>
                            {selectedDate && (
                                <div className="flex items-center gap-2">
                                    <Text variant="body-small">선택된 날짜:</Text>
                                    <Text variant="label">{selectedDate.toLocaleDateString('ko-KR')}</Text>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DesignSystemSection>

            {/* Gradients */}
            <DesignSystemSection title="그라데이션">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div
                        className="h-32 rounded-lg flex items-center justify-center border border-[var(--color-border-default)]"
                        style={{ background: 'var(--gradient-blessed-sky)' }}
                    >
                        <Heading level={3} className="text-white">Blessed Sky</Heading>
                    </div>
                    <div
                        className="h-32 rounded-lg flex items-center justify-center border border-[var(--color-border-default)]"
                        style={{ background: 'var(--gradient-primary-subtle)' }}
                    >
                        <Heading level={3} className="text-[var(--color-primary-700)]">Primary Subtle</Heading>
                    </div>
                </div>
            </DesignSystemSection>

            {/* Shadows */}
            <DesignSystemSection title="그림자">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {['xs', 'sm', 'base', 'md', 'lg', 'xl'].map((size) => (
                        <div key={size} className="space-y-2">
                            <div
                                className="h-24 rounded-lg bg-white flex items-center justify-center"
                                style={{ boxShadow: `var(--shadow-${size})` }}
                            >
                                <Text variant="label">shadow-{size}</Text>
                            </div>
                        </div>
                    ))}
                </div>
            </DesignSystemSection>
        </div>
    );
}
